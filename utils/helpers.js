function generateId() {
  var characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var lenString = 7;
  var randomstring = '';
  for (var i = 0; i < lenString; i++) {
    var rnum = Math.floor(Math.random() * characters.length);
    randomstring += characters.substring(rnum, rnum + 1);
  }
  return randomstring;
}

function getCurrentDate() {
  return new Date().toJSON().slice(0, 10);
}

module.exports = { generateId, getCurrentDate };
