const fs = require('fs');

module.exports = function (file, cb) {
  var data;
  var exists = true;
  try {
    fs.statSync(file);
  } catch (e) {
    exists = false;
  }
  if (!exists) {
    data = { global: {}, users: {} };
    saveData();
  } else {
    loadData(fs.readFileSync(file, 'utf8'));
  }

  var saving = false;
  function saveData() {
    if (saving) return;
    saving = true;

    fs.writeFile(file, JSON.stringify(data), err => {
      if (err) console.log('[SAVING DATA ERR]', err);
      saving = false;
    });
  }

  function loadData(d) {
    data = JSON.parse(d);
  }

  function global(str) {
    return data.global[str];
  }

  function user(str) {
    if (!data.users[str]) data.users[str] = {};
    return data.users[str];
  }

  return {
    global: data.global,
    users: data.users,
    user: user,
    save: saveData
  };
};