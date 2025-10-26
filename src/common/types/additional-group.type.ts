type Category = 'games' | 'business';
type Group = 'Xbox' | 'Valorant' | 'Twitch' | 'Steam';

export type AdditionalGroup = {
  icon: string;
  category: Category;
  group: Group;
};
