const versionExists = require('version-exists')

const version = process.env.VERSION;

versionExists('@lifeway/serverless-utilities', version)
  .then(exists => {
    if(exists) {
      console.error(`Package version ${version} already exists.`);
      process.exit(-1);
    } else {
      console.info(`${version} does not exist for package`);
      process.exit(0);
    }
  })
  .then(error => {
    console.error(error);
    process.exit(-1);
  })