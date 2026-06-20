export interface RecipientStream {
  id: string;
  sender: string;
  senderName: string;
  amount: number;
  rate: number;
  progress: number;
  status: "active" | "paused" | "completed";
  isPinned: boolean;
  startTime: string;
}

export const mockRecipientStreams: RecipientStream[] = [
  {
    id: "1",
    sender: "GD...3X4",
    senderName: "Stellar Dev Foundation",
    amount: 15000,
    rate: 20.5,
    progress: 75,
    status: "active",
    isPinned: true,
    startTime: "2024-03-01T00:00:00.000Z",
  },
  {
    id: "2",
    sender: "GC...9Y2",
    senderName: "Fluxora DAO",
    amount: 5000,
    rate: 5.25,
    progress: 45,
    status: "paused",
    isPinned: false,
    startTime: "2024-03-15T00:00:00.000Z",
  },
  {
    id: "3",
    sender: "GB...1Z8",
    senderName: "Ecosystem Grant #42",
    amount: 2500,
    rate: 1.5,
    progress: 10,
    status: "completed",
    isPinned: false,
    startTime: "2024-03-28T00:00:00.000Z",
  },
];
