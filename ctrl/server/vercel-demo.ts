// Sandbox state remains preserved in the suspended legacy store. Do not invent
// replacement balances while that independent dataset cannot be read.
export const config={maxDuration:60};
export default {fetch(){return Response.json({error:'The off-chain sandbox is paused during storage recovery. Use the Base Sepolia wallet game; the original sandbox data has not been deleted.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'3600'}});}};
