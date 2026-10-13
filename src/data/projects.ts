import records from './projects.json';

export interface Project {
  repo?: string;
  title: string;
  href?: string;
  description?: string;
  image?: string;
  imageLight?: string;
  video?: string;
  section?: string;
  home?: { order: number };
}

export const projects: Project[] = records;
