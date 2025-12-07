import { getAllBlogs } from "@/src/lib/blogs";
import HomeCoverSection from "../components/Home/HomeCoverSection";
import FeaturedPosts from "../components/Home/FeaturedPosts";
import RecentPosts from "../components/Home/RecentPosts";
import BrandHero from "../components/Brand/BrandHero";

export const revalidate = 60;

export default async function Home() {
  const blogs = await getAllBlogs();

  if (!blogs || blogs.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center">
        <div className="w-full px-5 sm:px-10 md:px-24 lg:px-32">
          <BrandHero />
        </div>
        <div className="w-full px-5 sm:px-10 md:px-24 lg:px-32 py-16 text-center">
          <p className="text-lg font-semibold text-dark dark:text-light">
            Blog posts will appear here once they are published.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center">
      <div className="w-full px-5 sm:px-10 md:px-24 lg:px-32">
        <BrandHero />
      </div>
      <HomeCoverSection blogs={blogs} />
      <FeaturedPosts blogs={blogs} />
      <RecentPosts blogs={blogs} />
    </main>
  )
}
