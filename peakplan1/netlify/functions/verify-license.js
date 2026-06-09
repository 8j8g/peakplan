// ═══════════════════════════════════════════════
// هاد الملف يشتغل على السيرفر — المستخدم ما يشوفه
// ═══════════════════════════════════════════════

exports.handler = async (event) => {

  // السماح فقط لطلبات POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'Invalid request' }) };
  }

  const { key, platform } = body;

  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'No key provided' }) };
  }

  // ── تحقق من Gumroad ──
  if (platform === 'gumroad' || platform === 'auto') {
    try {
      const gumRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          product_id: process.env.GUMROAD_PRODUCT_ID,
          license_key: key,
          increment_uses_count: 'true'
        })
      });

      const gumData = await gumRes.json();

      if (gumData.success) {
        // التحقق إن الكود ما اتستخدم أكثر من مرة
        const uses = gumData.uses || 1;
        if (uses <= 1) {
          return {
            statusCode: 200,
            body: JSON.stringify({ valid: true, platform: 'gumroad', email: gumData.purchase?.email })
          };
        } else {
          return {
            statusCode: 200,
            body: JSON.stringify({ valid: false, error: 'License already used on another device' })
          };
        }
      }
    } catch (e) {
      console.error('Gumroad error:', e);
    }
  }

  // ── تحقق من Whop ──
  if (platform === 'whop' || platform === 'auto') {
    try {
      const whopRes = await fetch(`https://api.whop.com/api/v2/licenses/${key}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const whopData = await whopRes.json();

      if (whopData.valid) {
        return {
          statusCode: 200,
          body: JSON.stringify({ valid: true, platform: 'whop' })
        };
      }
    } catch (e) {
      console.error('Whop error:', e);
    }
  }

  // لو وصلنا هون يعني الكود غلط
  return {
    statusCode: 200,
    body: JSON.stringify({ valid: false, error: 'Invalid license key' })
  };
};
