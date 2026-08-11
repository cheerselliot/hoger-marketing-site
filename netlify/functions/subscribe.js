const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function buildTags(utm) {
  const tags = new Set(['site:hoger', 'hoger']);
  if (utm?.campaign) tags.add(`utm:${utm.campaign}`);
  if (utm?.source) tags.add(`ref:${utm.source}`);
  return [...tags];
}

function parseButtondownError(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text.slice(0, 200) || undefined };
  }
}

function isDuplicateError(status, text, parsed) {
  if (status !== 400) return false;
  const haystack = `${text} ${parsed.code ?? ''} ${parsed.detail ?? ''}`.toLowerCase();
  return haystack.includes('already') || parsed.code === 'subscriber_already_exists';
}

function shouldRetryWithoutTags(status, parsed, tags) {
  if (tags.length === 0) return false;
  if (status === 401 || status === 429) return false;
  const haystack = `${parsed.code ?? ''} ${parsed.detail ?? ''}`.toLowerCase();
  return status === 400 || status === 403 || status === 422 || haystack.includes('tag');
}

async function createButtondownSubscriber(apiKey, payload) {
  return fetch('https://api.buttondown.com/v1/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Buttondown-Collision-Behavior': 'add',
    },
    body: JSON.stringify(payload),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: 'Subscribe not configured' }, 503);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  if (body.website) {
    return json({ ok: true });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'Invalid email' }, 400);
  }

  const utm = body.utm;
  const tags = buildTags(utm);
  const metadata = {
    slug: 'hoger',
    hostname: event.headers.host || 'hoger.ai',
    utm: utm ?? null,
    tags: tags.join(','),
  };

  let bdRes = await createButtondownSubscriber(apiKey, {
    email_address: email,
    tags,
    type: 'regular',
    metadata,
  });

  if (!bdRes.ok) {
    let errText = await bdRes.text();
    let parsed = parseButtondownError(errText);

    if (isDuplicateError(bdRes.status, errText, parsed)) {
      return json({ ok: true, duplicate: true });
    }

    if (shouldRetryWithoutTags(bdRes.status, parsed, tags)) {
      bdRes = await createButtondownSubscriber(apiKey, {
        email_address: email,
        type: 'regular',
        metadata,
      });
      if (bdRes.ok) {
        return json({ ok: true });
      }
      errText = await bdRes.text();
      parsed = parseButtondownError(errText);
      if (isDuplicateError(bdRes.status, errText, parsed)) {
        return json({ ok: true, duplicate: true });
      }
    }

    console.error('Buttondown error', bdRes.status, errText);
    const status = bdRes.status === 429 ? 429 : bdRes.status >= 500 ? 502 : 400;
    return json(
      { ok: false, error: parsed.detail || 'Could not subscribe' },
      status,
    );
  }

  return json({ ok: true });
};
