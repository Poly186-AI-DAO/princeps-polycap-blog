import { compareDesc } from "date-fns";

export const cx = (...classNames) => classNames.filter(Boolean).join(" ");

export const sortBlogs = (blogs) => {
  return blogs
    .slice()
    .sort((a, b) => compareDesc(new Date(a.publishedAt), new Date(b.publishedAt)));
};
