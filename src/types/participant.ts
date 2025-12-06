export interface Participant {
  id: string;
  name: string;
  phone?: string;
  blacklist?: string[];
}

export interface SecretSantaGroup {
  participants: Participant[];
  drawResults: { [key: string]: string };
  groupId: string;
}
