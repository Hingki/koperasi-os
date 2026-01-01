const path = require('path');
process.env.TS_NODE_PROJECT = path.resolve(__dirname, 'tsconfig.script.json');
require('ts-node').register();
require('tsconfig-paths').register();
require('./scripts/uat-worst-case.ts');