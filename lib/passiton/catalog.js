import {createHash} from 'node:crypto';
export const source = {
  id:'asha-demo-2026', title:'Asha Learning Grant — demo handbook', fictional:true,
  notice:'An authored, fictional handbook for testing this app. No real scholarship or application service is offered.',
  sections:[
    {id:'S1',title:'§1 · Who this demonstration describes',text:'The fictional Asha Learning Grant supports first-year undergraduate students. This demonstration does not collect applications or decide anyone’s eligibility.'},
    {id:'S2',title:'§2 · Provisional applications',text:'Students awaiting final results may apply with their latest available marksheet. Final results must be uploaded by 30 September 2026.'},
    {id:'S3',title:'§3 · Documents',text:'The demo application checklist contains a latest available marksheet, an admission offer, and a one-page statement of study plans. Do not upload identity documents, bank details, or personal records to this demonstration.'},
    {id:'S4',title:'§4 · Submission',text:'In this fictional example, the application and study statement are submitted together through the grant portal by 15 September 2026. There is no application fee. No real grant portal exists for this demonstration.'},
    {id:'S5',title:'§5 · Review and clarification',text:'A human grant coordinator reviews applications. Receiving guidance does not guarantee an award. If the handbook does not answer a question, ask the coordinator instead of inventing a rule.'}
  ]
};
export const sourceVersion=createHash('sha256').update(JSON.stringify(source)).digest('hex');
export const questions=[
  {id:'provisional',title:'Can I apply before my final results?',language:'hi',sectionIds:['S2'],topic:'Provisional applications'},
  {id:'documents',title:'Which documents do I need?',language:'en',sectionIds:['S3'],topic:'Application documents'},
  {id:'submission',title:'How do I submit my application?',language:'hi',sectionIds:['S4'],topic:'Submitting an application'}
];
export const languages={en:'English',hi:'Hindi'};
export function getQuestion(id){const q=questions.find(q=>q.id===id);if(!q)throw Object.assign(new Error('Choose a question from the demo collection.'),{status:400});return q;}
export function getLanguage(value){if(!Object.hasOwn(languages,value))throw Object.assign(new Error('Choose English or Hindi.'),{status:400});return value;}
export const bounty={lamports:1_000_000,recipient:'E2F4s8Mj2Ypw7KdxX8rJtV1X2Y7qhZuuWEkPDjNb9FvP',network:'devnet',label:'0.001 test SOL',purpose:'Reviewed knowledge contribution'};
