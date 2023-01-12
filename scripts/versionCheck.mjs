import npmName from 'npm-name';
import fetch from 'node-fetch';

/* eslint-disable no-console */

const version = process.env.npm_package_version;

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
  });


function versionExists(module, version){
  return new Promise((resolve, reject) => {
    // Npm-name checks if the name of the module is available
    return npmName(module)
      .then(isNoValid => {
        if (isNoValid)
          throw new Error(`Error > Cannot find ${module} in the NPM registry`);

        fetch(`http://registry.npmjs.org/${module}`)
          .then(res => res.json())
          .then(body => {
            return resolve({}.hasOwnProperty.call(body.time, version));
          });
      })
      .catch(err => reject(err.message));
  });
}
