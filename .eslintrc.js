module.exports = {
  extends: ['corinth/node'],
  overrides: [
    {
      extends: [
        'corinth',
        'corinth/typescript',
        'plugin:import/typescript',
      ],
      files: ['**/*.ts'],
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts'],
        },
        'import/resolver': {
          node: {
            extensions: ['.js', '.ts']
          }
        }
      },
    },
  ],
};
