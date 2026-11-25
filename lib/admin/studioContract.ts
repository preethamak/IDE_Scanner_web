export type FactSnapshot={id:string;revision:number;title:string;statement:string;source_url:string;lifecycle:'shipped'|'beta'|'planned';expires_at:string};
export type Slide={title:string;body:string;source_url?:string};
export type SocialArtifact={title:string;caption:string;hashtags:string[];slides:Slide[];facts:FactSnapshot[]};
export function publicFactUrl(value:string) {
 const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='abscissa.dev'||url.username||url.password||url.search||url.hash||/^\/(admin|api|workspace|account|reports)(\/|$)/.test(url.pathname))throw new Error('Use a public Abscissa page without query parameters.');return url.toString();
}
export function buildSocialArtifact(facts:FactSnapshot[],format:'release'|'explainer'|'milestone'='explainer'):SocialArtifact {
 if(!facts.length||facts.length>6)throw new Error('Choose one to six approved facts.');
 const title=facts[0].title;
 const statement=(fact:FactSnapshot)=>`${fact.lifecycle==='planned'?'Planned: ':fact.lifecycle==='beta'?'Beta: ':''}${fact.statement}`;
 const caption=[format==='release'?`Product update: ${title}`:format==='milestone'?title:`A closer look: ${title}`,...facts.map(statement),'Evidence and limitations:',...facts.map(fact=>fact.source_url),'Explore the exact-release workflow: https://abscissa.dev/registry'].join('\n\n');
 if(caption.length>2700)throw new Error('The selected facts exceed the post length. Choose fewer facts.');
 return{title,caption,hashtags:['#DeveloperSecurity','#VSCode','#Abscissa'],slides:[{title,body:format==='milestone'?'A recorded product milestone.':'What the evidence shows, and what it does not.'},...facts.map(fact=>({title:fact.title,body:statement(fact),source_url:fact.source_url})),{title:'Check the release. Read the evidence.',body:'An assessment applies to the analyzed artifact and recorded coverage. Unreviewed does not mean approved.',source_url:'https://abscissa.dev/registry'}],facts};
}
export function validateArtifact(value:SocialArtifact) {
 if(!value.title.trim()||value.title.length>160||!value.caption.trim()||value.caption.length>2700)throw new Error('Use a title up to 160 characters and caption up to 2,700 characters.');
 if(!Array.isArray(value.hashtags)||value.hashtags.length>5||value.hashtags.some(tag=>!/^#[A-Za-z][A-Za-z0-9]{0,39}$/.test(tag)))throw new Error('Use at most five plain hashtags.');
 if(!Array.isArray(value.slides)||value.slides.length<2||value.slides.length>8||value.slides.some(slide=>!slide||typeof slide.title!=='string'||typeof slide.body!=='string'||slide.title.length>160||slide.body.length>1400))throw new Error('Use two to eight bounded slides.');
 for(const slide of value.slides)if(slide.source_url)publicFactUrl(slide.source_url);
}
export function artifactPayload(value:SocialArtifact) {return JSON.stringify({template_version:"abscissa-briefing-v1",title:value.title,caption:value.caption,hashtags:value.hashtags,slides:value.slides,facts:value.facts});}
