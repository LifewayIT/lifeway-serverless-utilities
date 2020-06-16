interface SideEffect <T> {
  (some: T): void
} 

export const tap = <T>(sideEffect: SideEffect<T>) => (arg: T) => {
  sideEffect(arg);
  return arg;
};

export const supply = (obj: any) => () => obj;
