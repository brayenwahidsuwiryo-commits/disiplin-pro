// Generates the official Disiplin Pro Excel import template in the browser.
(() => {
  function makeTemplate() {
    if (!window.XLSX) return alert('Library Excel belum siap.');
    const wb = window.XLSX.utils.book_new();
    const classes = ['Kelas 1','Kelas 2','Kelas 3'];
    classes.forEach(className => {
      const rows = [
        ['Nama Wali Kelas: '],
        ['No.','NIS','Nama','Nama Orang Tua','NOMER TELEPON ORANG TUA','Keterangan'],
        [1,'','Contoh Nama Siswa','','',''],
        [2,'','','','','']
      ];
      const ws = window.XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{wch:8},{wch:18},{wch:28},{wch:28},{wch:28},{wch:35}];
      window.XLSX.utils.book_append_sheet(wb, ws, className);
    });
    window.XLSX.writeFile(wb, 'Template_Import_Siswa_Disiplin_Pro.xlsx');
  }
  window.DisiplinProExcelTemplate = { makeTemplate };
})();
