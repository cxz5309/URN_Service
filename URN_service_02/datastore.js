const initData = (category, type) => {
  return {
    resource_id: c-20000000000000,
    date: 20000000,
    provider: init,
    region: init,
    account: init,
    category,
    type,
    timestamp: 0000000000000
  }
}
const userData = {
  service: {
    'command-aws': [initData('command', 'aws')]
  }
};

module.exports = {initData, userData}