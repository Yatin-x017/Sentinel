import type { LanyardMember } from "../components/TeamLanyardRail"

export const TEAM: LanyardMember[] = [
  {
    id: "yatin",
    name: "Yatin",
    role: "Team lead",
    team: "Sentinel",
    image: "/team/yatin.jpg",
    tone: 1,
    bio: "Leads the project and shapes what the first version checks.",
    tags: ["Planning", "Sources"],
    links: [
      { label: "Portfolio", href: "https://yatinsharma.is-a.dev" },
      { label: "GitHub", href: "https://github.com/Yatin-x017" },
    ],
  },
  {
    id: "ekansh",
    name: "Ekansh",
    role: "Frontend and design system",
    team: "Sentinel",
    image: "/team/ekansh.jpg",
    tone: 5,
    bio: "Builds the interface and the design system behind it.",
    tags: ["React", "Tailwind"],
  },
  {
    id: "dhaval",
    name: "Dhaval",
    role: "Backend",
    team: "Sentinel",
    image: "/team/dhaval.jpg",
    tone: 2,
    bio: "Builds the server that runs each check.",
    tags: ["Node", "Express"],
  },
  {
    id: "puneet",
    name: "Puneet",
    role: "Data quality",
    team: "Sentinel",
    image: "/team/puneet.jpg",
    tone: 4,
    bio: "Keeps the stored data clean and the results accurate.",
    tags: ["MongoDB", "Data quality"],
  },
]
