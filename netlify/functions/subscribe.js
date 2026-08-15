const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(data),
  };
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

function clientStatusForButtondown(status) {
  if (status === 401 || status === 403) return 503;
  if (status === 429) return 429;
  if (status >= 500) return 502;
  return 400;
}

function userErrorForButtondown(status, parsed) {
  if (status === 401 || status === 403) return 'Subscribe not configured';
  if (status === 429) return 'Too many signups. Try again later.';
  if (parsed.detail) return parsed.detail;
  return 'Could not subscribe';
}

function clientIp(event) {
  const forwarded = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || undefined;
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
  const ip = clientIp(event);
  const metadata = {
    slug: 'hoger',
    hostname: event.headers.host || 'hoger.ai',
    utm: utm ?? null,
    tags: tags.join(','),
  };

  const payload = {
    email_address: email,
    tags,
    type: 'regular',
    ...(ip ? { ip_address: ip } : {}),
    metadata,
  };

  let bdRes = await createButtondownSubscriber(apiKey, payload);

  if (!bdRes.ok) {
    let errText = await bdRes.text();
    let parsed = parseButtondownError(errText);

    if (isDuplicateError(bdRes.status, errText, parsed)) {
      return json({ ok: true, duplicate: true });
    }

    if (shouldRetryWithoutTags(bdRes.status, parsed, tags)) {
      console.warn('Buttondown rejected tags; retrying metadata-only subscribe', bdRes.status, errText);
      bdRes = await createButtondownSubscriber(apiKey, {
        email_address: email,
        type: 'regular',
        ...(ip ? { ip_address: ip } : {}),
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
    return json(
      { ok: false, error: userErrorForButtondown(bdRes.status, parsed) },
      clientStatusForButtondown(bdRes.status),
    );
  }

  return json({ ok: true });
};
