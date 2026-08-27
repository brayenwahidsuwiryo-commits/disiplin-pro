(() => {
  function render() {
    const page = document.querySelector('#page');
    if (!page || page.querySelector('[data-excel-import-card]')) return;
    const title = (document.querySelector('#pageTitle')?.textContent || '').toLowerCase();
    if (!title.includes('siswa') && !page.textContent.toLowerCase().includes('master siswa')) return;
    const card = document.createElement('section');
    card.className = 'card excel-import-card';
    card.dataset.excelImportCard = '1';
    card.innerHTML = `<div class="toolbar"><div><h3>Import Siswa dari Excel</h3><p class="hint">Satu sheet = satu kelas. Nama sheet menjadi nama kelas.</p></div></div><div class="excel-import-actions"><label class="primary" for="excelStudentImport">📥 Pilih File Excel</label><input id="excelStudentImport" type="file" accept=".xlsx,.xls" hidden><button type="button" class="secondary" id="downloadExcelTemplate">⬇ Template Excel</button></div><div class="hint excel-rules"><b>Format:</b> A1 = nama wali kelas · baris 2 = No., NIS, Nama, Nama Orang Tua, NOMER TELEPON ORANG TUA, Keterangan · data mulai baris 3. Hanya Nama yang wajib; kolom lain boleh kosong. Siswa hasil import otomatis aktif.</div></section>`;
    page.prepend(card);
    card.querySelector('#downloadExcelTemplate').onclick = () => window.DisiplinProExcelTemplate?.makeTemplate();
  }
  const observer = new MutationObserver(render);
  window.addEventListener('load', () => { render(); observer.observe(document.body, { childList: true, subtree: true }); });
})();
