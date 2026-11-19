(() => {
  const original=globalThis.FocusClient;
  document.body.dataset.permissionRequests='0';
  const deny=new URLSearchParams(location.search).get('deny')==='1';
  globalThis.FocusClient=Object.freeze({...original,requestNotifications(){
    document.body.dataset.permissionRequests=String(Number(document.body.dataset.permissionRequests)+1);
    return deny?Promise.resolve(false):original.requestNotifications();
  }});
})();
