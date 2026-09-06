export function collectionFromSearch(search='') {
  const p=new URLSearchParams(search);
  if(p.get('collection')==='practice')return 'practice';
  if(p.get('collection')==='open-source')return 'open-source';
  if(['provisional','documents','submission'].includes(p.get('question'))||p.get('example')==='correction'&&!p.has('question'))return 'practice';
  return 'open-source';
}
