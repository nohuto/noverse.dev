import records from './projects.json';

export interface Project {
  repo?: string;
  title: string;
  href?: string;
  description?: string;
  image?: string;
  video?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  section?: string;
  projects?: boolean;
  home?: {
    name: string;
    docs: string;
    description?: string;
    docsLabel?: string;
    docsTitle?: string;
    external?: boolean;
    order: number;
  };
}

export const projects: Project[] = records;
