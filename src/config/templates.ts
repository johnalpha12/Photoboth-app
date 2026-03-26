export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Template {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  slots: Slot[];
}

export const templates: Template[] = [
  {
    "id": "template-1",
    "name": "Strip Style 1",
    "image": "/templates/gambar (1).png",
    "width": 885,
    "height": 2658,
    "slots": [
      { "x": 49, "y": 195, "w": 788, "h": 526 },
      { "x": 49, "y": 794, "w": 788, "h": 524 },
      { "x": 49, "y": 1391, "w": 788, "h": 524 }
    ]
  },
  {
    "id": "template-2",
    "name": "Strip Style 2",
    "image": "/templates/gambar (2).png",
    "width": 952,
    "height": 2857,
    "slots": [
      { "x": 50, "y": 271, "w": 852, "h": 548 },
      { "x": 50, "y": 1006, "w": 852, "h": 548 },
      { "x": 50, "y": 1772, "w": 852, "h": 496 }
    ]
  },
  {
    "id": "template-3",
    "name": "Wide Format 1",
    "image": "/templates/gambar (3).png",
    "width": 1346,
    "height": 2020,
    "slots": [
      { "x": 26, "y": 699, "w": 1294, "h": 517 },
      { "x": 26, "y": 1387, "w": 1294, "h": 249 }
    ]
  },
  {
    "id": "template-4",
    "name": "Wide Format 2",
    "image": "/templates/gambar (4).png",
    "width": 1347,
    "height": 2019,
    "slots": [
      { "x": 62, "y": 842, "w": 1222, "h": 501 },
      { "x": 62, "y": 1420, "w": 1222, "h": 442 }
    ]
  },
  {
    "id": "template-5",
    "name": "Strip Style 3",
    "image": "/templates/gambar (5).png",
    "width": 953,
    "height": 2854,
    "slots": [
      { "x": 45, "y": 234, "w": 854, "h": 547 },
      { "x": 45, "y": 991, "w": 854, "h": 548 },
      { "x": 45, "y": 1756, "w": 854, "h": 547 }
    ]
  },
  {
    "id": "template-6",
    "name": "Strip Style 4",
    "image": "/templates/gambar (6).png",
    "width": 952,
    "height": 2857,
    "slots": [
      { "x": 43, "y": 188, "w": 857, "h": 549 },
      { "x": 43, "y": 951, "w": 857, "h": 549 },
      { "x": 43, "y": 1715, "w": 857, "h": 549 }
    ]
  }
];
