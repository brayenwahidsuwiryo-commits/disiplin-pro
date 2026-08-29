/* Violation import rules v2.1
 * Unified violation master: category is an attribute, never a blocking master dependency.
 * Importing a new violation creates it automatically; records then use the resolved master point value.
 */
(function () {
  window.DISIPLIN_PRO_VIOLATION_IMPORT_RULES = {
    unifiedMaster: true,
    categoryAsAttribute: true,
    autoCreateMissingMaster: true,
    pointSource: 'violation_master',
    cancelledExcludedFromPoints: true
  };

  window.resolveViolationMaster = function resolveViolationMaster(row, masters) {
    const name = String(row?.nama_pelanggaran || row?.pelanggaran || row?.jenis_pelanggaran || '').trim();
    if (!name) throw new Error('Nama pelanggaran wajib diisi.');
    const category = String(row?.kategori || row?.category || '').trim();
    const pointsRaw = row?.poin ?? row?.point ?? row?.points ?? 0;
    const points = Number.isFinite(Number(pointsRaw)) ? Number(pointsRaw) : 0;
    const list = Array.isArray(masters) ? masters : [];
    const normalize = value => String(value || '').trim().toLowerCase();
    let master = list.find(item => normalize(item.name || item.nama_pelanggaran) === normalize(name));
    if (!master) {
      master = {
        name,
        category,
        point_value: points,
        is_active: true,
        auto_created_from_import: true
      };
      list.push(master);
    } else if (!master.category && category) {
      master.category = category;
    }
    return master;
  };
})();
