// Google Places API (New) reviews endpoint — Vercel Serverless Function.
// Configure GOOGLE_MAPS_API_KEY and GOOGLE_PLACE_ID in Vercel Environment Variables.
// Only public, Google-sourced reviews are displayed. Never expose the API key in browser code.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
  if(req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  const key=process.env.GOOGLE_MAPS_API_KEY;
  const id=process.env.GOOGLE_PLACE_ID;
  if(!key||!id) return res.status(503).json({configured:false,reviews:[]});
  if(!/^[a-zA-Z0-9_-]{6,200}$/.test(id)) return res.status(500).json({error:'Invalid place configuration'});
  try {
    const upstream=await fetch('https://places.googleapis.com/v1/places/'+encodeURIComponent(id)+'?languageCode=es',{
      headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':'id,displayName,rating,userRatingCount,reviews.rating,reviews.text,reviews.originalText,reviews.authorAttribution.displayName,reviews.authorAttribution.uri,reviews.relativePublishTimeDescription,reviews.publishTime,googleMapsUri'}
    });
    if(!upstream.ok) return res.status(502).json({error:'Google Places unavailable'});
    const p=await upstream.json();
    const reviews=(p.reviews||[]).filter(r=>r.rating && (r.text?.text || r.originalText?.text)).slice(0,5).map(r=>({
      rating:r.rating,
      text:(r.text?.text||r.originalText?.text||'').slice(0,1800),
      author:r.authorAttribution?.displayName||'Cliente de Google',
      authorUrl:r.authorAttribution?.uri||p.googleMapsUri||null,
      date:r.relativePublishTimeDescription||r.publishTime||''
    }));
    return res.status(200).json({configured:true,rating:p.rating||null,count:p.userRatingCount||null,url:p.googleMapsUri||'https://maps.app.goo.gl/gAuzwrmENfc9biu1A?g_st=ic',reviews,attribution:'Google'});
  }catch{return res.status(502).json({error:'Unable to load reviews'});}
};