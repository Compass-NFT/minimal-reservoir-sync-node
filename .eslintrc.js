module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    "no-console": "off",
    "max-len": "off",
    "radix": "off",
    "no-await-in-loop": "warn",
    "class-methods-use-this": "off",
    '@typescript-eslint/indent': [
      'error',
      2,
      {
        "SwitchCase": 1,
        'ignoredNodes': [
          'FunctionExpression > .params[decorators.length > 0]',
          'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
          'ClassBody.body > PropertyDefinition[decorators.length > 0] > .key'
        ]
      }
    ],
  },
};
