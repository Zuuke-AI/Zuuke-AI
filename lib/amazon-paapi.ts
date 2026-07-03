import { createHmac, createHash } from 'node:crypto'

const REGION = 'us-east-1'
const HOST = 'webservices.amazon.com'
const PATH = '/paapi5/searchitems'
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'

function sha256hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

function hmacBuf(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}

function signingKey(secret: string, date: string): Buffer {
  return hmacBuf(hmacBuf(hmacBuf(hmacBuf('AWS4' + secret, date), REGION), 'ProductAdvertisingAPI'), 'aws4_request')
}

export interface PaapiProduct {
  title: string
  price: string
  asin: string
  url: string
}

export async function searchProducts(query: string): Promise<PaapiProduct | null> {
  const accessKey = process.env.AMAZON_ACCESS_KEY
  const secretKey = process.env.AMAZON_SECRET_KEY
  const partnerTag = process.env.AMAZON_PARTNER_TAG || 'zuuke06-20'
  if (!accessKey || !secretKey) return null

  const now = new Date()
  // yyyyMMddTHHmmssZ
  const dateTime =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0') +
    'T' +
    String(now.getUTCHours()).padStart(2, '0') +
    String(now.getUTCMinutes()).padStart(2, '0') +
    String(now.getUTCSeconds()).padStart(2, '0') +
    'Z'
  const date = dateTime.slice(0, 8)

  const body = JSON.stringify({
    Keywords: query,
    Resources: ['Offers.Listings.Price', 'ItemInfo.Title'],
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    SearchIndex: 'Electronics',
    ItemCount: 1,
  })

  // Canonical headers must be sorted alphabetically by header name
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-amz-date:${dateTime}\n` +
    `x-amz-target:${TARGET}\n`
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target'

  const canonicalRequest = [
    'POST',
    PATH,
    '',
    canonicalHeaders,
    signedHeaders,
    sha256hex(body),
  ].join('\n')

  const credScope = `${date}/${REGION}/ProductAdvertisingAPI/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', dateTime, credScope, sha256hex(canonicalRequest)].join('\n')
  const sig = hmacBuf(signingKey(secretKey, date), stringToSign).toString('hex')
  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`

  try {
    const res = await fetch(`https://${HOST}${PATH}`, {
      method: 'POST',
      headers: {
        'content-encoding': 'amz-1.0',
        'content-type': 'application/json; charset=utf-8',
        host: HOST,
        'x-amz-date': dateTime,
        'x-amz-target': TARGET,
        authorization: auth,
      },
      body,
    })
    if (!res.ok) return null
    const data = await res.json()
    const items = data?.SearchResult?.Items
    if (!items?.length) return null

    const item = items[0]
    const title: string = item?.ItemInfo?.Title?.DisplayValue || query
    const price: string | undefined = item?.Offers?.Listings?.[0]?.Price?.DisplayAmount
    const asin: string = item?.ASIN || ''
    if (!price) return null

    return { title, price, asin, url: `https://www.amazon.com/dp/${asin}?tag=${partnerTag}` }
  } catch {
    return null
  }
}
