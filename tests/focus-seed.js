(() => {
  const prefix='whatsapp-focus-demo:focus-tests:';
  for(const key of Object.keys(localStorage))if(key.startsWith(prefix)||key.startsWith('whatsapp-focus-demo:permission-denied-tests:'))localStorage.removeItem(key);
  const date=new Date(),day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  localStorage.setItem(prefix+'whatTheFocusUsage',JSON.stringify({days:{[day]:42*60000}}));
})();
