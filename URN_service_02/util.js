const moment = require('moment-timezone');
const ct = require('countries-and-timezones');

const categoryFormater = (type) => {
  switch (type) {
    default: return type.slice(0, 1);
  }
}

const dateFormater = (date) => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return [y, (m > 9 ? '' : '0') + m, (d > 9 ? '' : '0') + d].join('');
}

const fillZero = (num) => {
  const len = 6 - num.toString().length;
  return len > 0 ? new Array(len).fill('0').join('') + num : num
}

const getMoment = (region) => {
  const timezones = ct.getCountry(region).timezones;
  const now = moment().tz(timezones[0]);
  const timestamp = now.format('').format('X');
  const newDate = now.format('').format('YYYYMMDD');
  return { timestamp, newDate };
}

module.exports = {categoryFormater, dateFormater, fillZero, getMoment}