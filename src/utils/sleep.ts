/* eslint-disable no-promise-executor-return */
export default function sleep(ts) { return new Promise((resolve) => setTimeout(resolve, ts)); }
