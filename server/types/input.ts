export type Input = {
    artistName: string;
    album: {
      name: string;
      genre: string;
      released: Date;
    };
    track: {
      name: string;
    };
  };