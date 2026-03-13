export function argParser(args) {
  const result = {};

  for(let i = 0; i < args.length; i++) {
    result[args[i]] = args[i+1];
  }

  return result;
}