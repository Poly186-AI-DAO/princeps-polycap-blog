import {blogs} from "@/.velite/generated";
import HomeCoverSection from "../components/Home/HomeCoverSection";
import FeaturedPosts from "../components/Home/FeaturedPosts";
import RecentPosts from "../components/Home/RecentPosts";
import BrandHero from "../components/Brand/BrandHero";

export default function Home() {
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
