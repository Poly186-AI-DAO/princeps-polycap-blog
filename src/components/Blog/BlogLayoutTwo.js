import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const BlogLayoutTwo = ({blog}) => {
  return (
    <Link href={blog.url} className="group grid grid-cols-12 gap-4 items-center text-dark dark:text-light rounded-xl overflow-hidden hover-lift bg-light/50 dark:bg-light/5 border border-transparent dark:border-light/10 p-2">
      <div className="col-span-12 lg:col-span-4 h-full rounded-xl overflow-hidden">
        <Image
          src={blog.image.src}
          placeholder="blur"
          blurDataURL={blog.image.blurDataURL}
          alt={blog.title}
          width={blog.image.width}
          height={blog.image.height}
          className="aspect-square w-full h-full object-cover object-center group-hover:scale-105 transition-all ease duration-300"
          sizes="(max-width: 640px) 100vw,(max-width: 1024px) 50vw, 33vw"
        />
      </div>

      <div className="col-span-12 lg:col-span-8 w-full">
        <span className="inline-block w-full uppercase text-accent dark:text-accentDark font-semibold text-xs sm:text-sm">
          {blog.tags[0]}
        </span>
        <h2 className="font-semibold capitalize text-base sm:text-lg group-hover:text-accent dark:group-hover:text-accentDark transition-colors duration-300 my-1">
          {blog.title}
        </h2>
        <span className="inline-block w-full capitalize text-gray dark:text-light/50 font-semibold text-xs sm:text-base">
          {format(new Date(blog.publishedAt), "MMMM dd, yyyy")}
        </span>
      </div>
    </Link>
  );
};

export default BlogLayoutTwo;
