const express = require('express');
const auth = require('../middlewares/auth');
const { Order, Memory, sequelize } = require('../models');
const { OpenAI } = require('openai');

const router = express.Router();
const { chatCompletion } = require('../openaiClient');

/**
 * POST /agents/run
 * Body (optional): { persona?: 'Retail/E-commerce'|'Services'|'SaaS'|'Other' }
 *
 * Runs a simple multi-agent orchestration:
 * - Insight Agent: analyzes recent KPIs + channels and produces concise insights
 * - Marketing Agent: proposes one campaign (tagline, copy, CTA) tailored to persona
 * - Design Agent: proposes a tiny brand tweak (3-color palette + logo idea text)
 * Returns all outputs + a combined report for judges.
 */
router.post('/run', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const persona = (req.body?.persona || '').toString().trim();

    // Read recent agent context to keep agents coherent
    const recentContexts = await Memory.findAll({
      where: { user_id, type: 'agent_context' },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['content', 'createdAt']
    });
    const agentContext = recentContexts
      .map(c => `- ${new Date(c.createdAt).toISOString()}: ${c.content}`)
      .join('\n');
    const contextLine = agentContext ? `Recent Agent Context:\n${agentContext}\n` : '';

    // 1) Compute KPIs (last 30 days)
    const { Op } = require('sequelize');
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    const summary = await Order.findOne({
      where: { user_id, createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenueMonth'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'profitMonth'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'aov'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('isNewCustomer'), 'INTEGER')), 'newCustomers'],
      ],
      raw: true,
    });

    const kpis = {
      revenueMonth: parseFloat(summary?.revenueMonth || 0),
      profitMonth: parseFloat(summary?.profitMonth || 0),
      aov: parseFloat(summary?.aov || 0),
      newCustomers: parseInt(summary?.newCustomers || 0, 10),
    };

    const channels = await Order.findAll({
      where: { user_id, createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: ['platform', [sequelize.fn('SUM', sequelize.col('amount')), 'value']],
      group: ['platform'],
      raw: true,
    });

    const channelsLine = channels
      .filter(c => !!c.platform)
      .map(c => `${c.platform}:${parseFloat(c.value || 0)}`)
      .join(', ') || 'none';

    // 2) Agent Prompts
    const personaLine = persona ? `Business Type: ${persona}.` : '';

    const insightPrompt = `
${contextLine}
${personaLine}
KPIs (30 days): Revenue ${kpis.revenueMonth} INR, Profit ${kpis.profitMonth} INR, AOV ${kpis.aov} INR, New Customers ${kpis.newCustomers}.
Channels (revenue): ${channelsLine}.
Return 3 bullet insights with one final 1-sentence recommendation.
    `.trim();

    const marketingPrompt = `
${contextLine}
${personaLine}
Based on KPIs and channels: ${channelsLine}.
Propose ONE marketing campaign:
- Tagline
- Primary copy (max 2 sentences)
- CTA
Tone: friendly and ROI-focused. Return JSON with keys { "tagline": "...", "copy": "...", "cta": "..." }.
    `.trim();

    const designPrompt = `
${contextLine}
${personaLine}
Propose a tiny brand tweak:
- A 3-color hex palette named: primary, secondary, accent
- A simple logo concept idea in one sentence
Return JSON: {
  "palette": { "primary": "#...", "secondary": "#...", "accent": "#..." },
  "logoIdea": "..."
}
    `.trim();

    // 3) Run agents in parallel
    const [insightResp, marketingResp, designResp] = await Promise.all([
      chatCompletion({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an analytics Insight Agent. Be concise and helpful.' },
          { role: 'user', content: insightPrompt },
        ],
        max_tokens: 220,
        temperature: 0.6
      }).catch(e => ({ error: e?.message })),
      chatCompletion({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a Marketing Agent. Return compact JSON only.' },
          { role: 'user', content: marketingPrompt },
        ],
        max_tokens: 180,
        temperature: 0.7
      }).catch(e => ({ error: e?.message })),
      openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a Design Agent. Return compact JSON only.' },
          { role: 'user', content: designPrompt },
        ],
        max_tokens: 160,
        temperature: 0.7
      }).catch(e => ({ error: e?.message })),
    ]);

    // 4) Parse outputs with safe fallbacks
    const insightAgent = (() => {
      if (insightResp?.error) return { text: 'Insight Agent unavailable. Please retry shortly.' };
      const text = insightResp?.choices?.[0]?.message?.content?.trim() || '';
      return { text };
    })();

    const marketingAgent = (() => {
      if (marketingResp?.error) {
        return { tagline: 'Grow smart, grow fast.', copy: 'Run a comeback offer for dormant customers.', cta: 'Redeem offer' };
      }
      try {
        const json = JSON.parse(marketingResp.choices?.[0]?.message?.content || '{}');
        return {
          tagline: json.tagline || 'Boost your sales, today.',
          copy: json.copy || 'Engage your audience with a focused campaign.',
          cta: json.cta || 'Get Started'
        };
      } catch {
        return { tagline: 'Grow smart, grow fast.', copy: 'Run a comeback offer for dormant customers.', cta: 'Redeem offer' };
      }
    })();

    const designAgent = (() => {
      if (designResp?.error) {
        return { palette: { primary: '#4F46E5', secondary: '#0EA5E9', accent: '#F59E0B' }, logoIdea: 'Abstract lettermark with subtle upward arrow.' };
      }
      try {
        const json = JSON.parse(designResp.choices?.[0]?.message?.content || '{}');
        return {
          palette: json.palette || { primary: '#4F46E5', secondary: '#0EA5E9', accent: '#F59E0B' },
          logoIdea: json.logoIdea || 'Abstract monogram for versatile branding.'
        };
      } catch {
        return { palette: { primary: '#4F46E5', secondary: '#0EA5E9', accent: '#F59E0B' }, logoIdea: 'Abstract lettermark with subtle upward arrow.' };
      }
    })();

    // 5) Combined report
    const topChannel =
      channels
        .map(c => ({ key: c.platform, value: parseFloat(c.value || 0) }))
        .sort((a, b) => b.value - a.value)[0]?.key || 'n/a';

    const combinedReport = `
Multi-Agent Report (${persona || 'Generic'}):
- Insight Agent:
${insightAgent.text}

- Marketing Agent:
Tagline: ${marketingAgent.tagline}
Copy: ${marketingAgent.copy}
CTA: ${marketingAgent.cta}

- Design Agent:
Palette: primary ${designAgent.palette.primary}, secondary ${designAgent.palette.secondary}, accent ${designAgent.palette.accent}
Logo Idea: ${designAgent.logoIdea}

Top channel (30d): ${topChannel}.
    `.trim();

    // Persist unified agent context for memory graph + future coherence
    try {
      await Memory.create({
        user_id,
        type: 'agent_context',
        content: JSON.stringify({
          persona: persona || 'Generic',
          insight: (insightAgent?.text || '').slice(0, 800),
          marketing: marketingAgent,
          design: designAgent,
          topChannel,
          at: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to persist agent_context:', e.message);
    }

    res.json({
      success: true,
      insightAgent,
      marketingAgent,
      designAgent,
      combinedReport
    });
  } catch (err) {
    console.error('Agents pipeline failed:', err);
    res.status(500).json({ error: 'Failed to run multi-agent pipeline' });
  }
});

/**
 * POST /agents/growth-advisor
 * Body: { persona? }
 * Reads latest KPIs + tasks backlog and proposes top 3 immediate growth actions.
 * Returns: { actions: [{ title, why, impact }] }
 */
router.post('/growth-advisor', auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const persona = (req.body?.persona || '').toString().trim();

    const { Op } = require('sequelize');
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    // KPIs
    const summary = await Order.findOne({
      where: { user_id, createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenueMonth'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'profitMonth'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'aov'],
        [sequelize.fn('SUM', sequelize.cast(sequelize.col('isNewCustomer'), 'INTEGER')), 'newCustomers'],
      ],
      raw: true,
    });

    const kpis = {
      revenueMonth: parseFloat(summary?.revenueMonth || 0),
      profitMonth: parseFloat(summary?.profitMonth || 0),
      aov: parseFloat(summary?.aov || 0),
      newCustomers: parseInt(summary?.newCustomers || 0, 10),
    };

    // Backlog: recent open tasks
    const tasks = await require('../models').Task.findAll({
      where: { user_id, status: 'open' },
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['title', 'priority', 'progress', 'source', 'createdAt']
    });

    // Simple health signals
    const channels = await Order.findAll({
      where: { user_id, createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: ['platform', [sequelize.fn('SUM', sequelize.col('amount')), 'value']],
      group: ['platform'],
      raw: true,
    });

    const personaLine = persona ? `Business Type: ${persona}.` : '';
    const tasksLine = tasks.map(t => `- [${t.priority}|${t.progress}%] ${t.title}`).slice(0, 10).join('\n') || 'None';
    const channelsLine = channels
      .filter(c => !!c.platform)
      .map(c => `${c.platform}:${parseFloat(c.value || 0)}`)
      .join(', ') || 'none';

    const prompt = `
${personaLine}
KPIs (30d): Revenue ${kpis.revenueMonth} INR, Profit ${kpis.profitMonth} INR, AOV ${kpis.aov} INR, New Customers ${kpis.newCustomers}.
Channels (revenue): ${channelsLine}
Open Tasks (latest): 
${tasksLine}

Given the KPIs, channels, and backlog, propose the TOP 3 immediate growth actions.
Return JSON: { "actions": [ { "title": "...", "why": "...", "impact": "High|Medium|Low" }, ... ] }
Keep it concise and practical. Tailor to the persona if present.
    `.trim();

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a Growth Advisor Agent. Be specific and ROI-focused. Return JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 360,
      temperature: 0.6
    });

    let data = {};
    try {
      data = JSON.parse(resp.choices?.[0]?.message?.content || '{}');
    } catch {
      data = {
        actions: [
          { title: 'Optimize high-revenue channel creatives', why: 'Lift CTR and ROAS quickly.', impact: 'High' },
          { title: 'Dormant-customer comeback flow', why: 'Recover lapsed users with incentives.', impact: 'Medium' },
          { title: 'Bundle top SKUs', why: 'Increase AOV with targeted bundles.', impact: 'Medium' }
        ]
      };
    }

    // Persist as agent_context for timeline
    try {
      await Memory.create({
        user_id,
        type: 'agent_context',
        content: JSON.stringify({ advisor: 'growth', ...data, at: new Date().toISOString() })
      });
    } catch (e) {
      console.error('Persist growth-advisor context failed:', e.message);
    }

    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Growth advisor failed:', err);
    res.status(500).json({ error: 'Failed to run growth advisor' });
  }
});

module.exports = router;
