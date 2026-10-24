let onSignOut:(()=>void)|null=null;
export function registerSignOut(cb:()=>void){onSignOut=cb;return ()=>{onSignOut=null}}
export function showSignedOut(){onSignOut?.()}
