import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const BlogLayoutThree = ({ blog }) => {
  return (
    <Link href={blog.url} className="group block rounded-xl overflow-hidden bg-light/50 dark:bg-light/5 hover-lift border border-transparent dark:border-light/10">
      <div className="rounded-xl overflow-hidden">
        <Image
          src={blog.image.src}
          placeholder="blur"
          blurDataURL={blog.image.blurDataURL}
          alt={blog.title}
          width={blog.image.width}
          height={blog.image.height}
          className="aspect-[4/3] w-full h-full object-cover object-center group-hover:scale-105 transition-all ease duration-300"
          sizes="(max-width: 640px) 100vw,(max-width: 1024px) 50vw, 33vw"
        />
      </div>

      <div className="flex flex-col w-full p-4">
        <span className="uppercase text-accent dark:text-accentDark font-semibold text-xs sm:text-sm">
          {blog.tags[0]}
        </span>
        <h2 className="font-semibold capitalize text-base sm:text-lg text-dark dark:text-light group-hover:text-accent dark:group-hover:text-accentDark transition-colors duration-300 my-1">
          {blog.title}
        </h2>
        <span className="capitalize text-gray dark:text-light/50 font-semibold text-sm sm:text-base">
          {format(new Date(blog.publishedAt), "MMMM dd, yyyy")}
        </span>
      </div>
    </Link>
  );
};

export default BlogLayoutThree;
