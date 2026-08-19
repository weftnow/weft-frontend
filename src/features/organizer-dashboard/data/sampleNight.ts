import type { GroupView } from "../components/RoomMap";

/**
 * A night that never happened, so a new organizer can see one before they run
 * one.
 *
 * Fixed data in the frontend rather than a seeded row in Neon: a demo event in
 * the real database would surface in counts, exports and every analytic built
 * on the events table afterwards, and each of those would then need to learn to
 * exclude it. Nothing here is written anywhere; it is rendered through the same
 * RoomMap the live dashboard uses, so what a first-timer sees is the component
 * they will be watching on the night, not a picture of it.
 *
 * The shape is deliberately faithful to app/matching/groups.py: tables of four
 * to six, and four people who have not found their table yet. A room where
 * everyone has arrived and sat down on the first attempt is a render, not an
 * evening — and it would set an expectation the host's real screen breaks.
 *
 * Everyone here is invented. The screen that shows this says so.
 */
export type SampleNight = {
  name: string;
  when: string;
  guests: number;
  confirmed: number;
  groups: GroupView[];
};

/** Seats, in table order. Names carry no meaning beyond being plausible. */
const TABLES: { colour: string; names: string[] }[] = [
  {
    colour: "ember",
    names: [
      "Amara Okonkwo",
      "Diego Herrera",
      "Priya Raghunathan",
      "Tomás Lindqvist",
      "Yuki Nakamura",
      "Fatima Al-Rashid",
    ],
  },
  {
    colour: "teal",
    names: [
      "Nils Bergström",
      "Camila Restrepo",
      "Ravi Deshmukh",
      "Zoë Vermeulen",
      "Idris Bello",
    ],
  },
  {
    colour: "indigo",
    names: [
      "Marta Kowalczyk",
      "Hana Suzuki",
      "Sebastián Ocampo",
      "Leila Haddad",
      "Oskar Nowak",
    ],
  },
  {
    colour: "coral",
    names: [
      "Anaya Krishnan",
      "Mateo Villalobos",
      "Freya Sørensen",
      "Kwame Asante",
      "Isabela Moreira",
    ],
  },
  {
    colour: "lime",
    names: [
      "Arjun Patel",
      "Sofia Marchetti",
      "Emeka Nwosu",
      "Lucía Fernández",
      "Jonas Weber",
    ],
  },
  {
    colour: "violet",
    names: ["Meera Iyer", "Tariq Mansour", "Elena Petrova", "Rafael Duarte"],
  },
  {
    colour: "cyan",
    names: ["Naomi Adeyemi", "Henrik Dahl", "Valeria Ríos", "Chen Wei"],
  },
  {
    colour: "rose",
    names: ["Amira Benali", "Lukas Novák", "Bianca Toledo", "Farhan Rahman"],
  },
  {
    colour: "olive",
    names: ["Astrid Halvorsen", "Joaquín Salazar", "Nadia Karimi", "Theo Mensah"],
  },
];

/** Still on their way to a table when this snapshot was taken. */
const STILL_LOOKING = new Set([
  "Idris Bello",
  "Sofia Marchetti",
  "Chen Wei",
  "Theo Mensah",
]);

const groups: GroupView[] = TABLES.map((table, index) => ({
  index: index + 1,
  colour: table.colour,
  members: table.names.map((display_name) => ({
    display_name,
    confirmed: !STILL_LOOKING.has(display_name),
  })),
}));

const seats = groups.flatMap((group) => group.members);

export const SAMPLE_NIGHT: SampleNight = {
  name: "Founders & Operators, Thursday",
  when: "Thursday, 7:00 PM",
  guests: seats.length,
  confirmed: seats.filter((seat) => seat.confirmed).length,
  groups,
};
