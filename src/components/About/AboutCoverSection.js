import Image from 'next/image'
import React from 'react'
import profileCharacter from "../../../public/character.png"

const AboutCoverSection = () => {
  return (
    <section className='w-full md:h-[75vh] border-b-2 border-solid border-dark dark:border-light flex flex-col md:flex-row items-center justify-center text-dark dark:text-light px-4 xs:px-8 sm:px-10 lg:px-16 py-10 gap-8'>
        <div className='w-full md:w-1/2 h-full border-r-2 border-solid border-dark dark:border-light flex justify-center'> 
            <Image src={profileCharacter} alt="Princeps Polycap" 
            className='w-4/5  xs:w-3/4 md:w-full h-full object-contain object-center'
            priority
            sizes="(max-width: 768px) 100vw,(max-width: 1180px) 50vw, 50vw"
            />
        </div>

        <div className='w-full md:w-1/2 flex flex-col text-left items-start justify-center px-5 xs:p-10 pb-10 lg:px-16'>
            <h2 className='font-bold text-4xl xs:text-5xl sxl:text-6xl  text-center lg:text-left'>
            From factory floor shifts to Poly186
            </h2>
            <p className='font-medium mt-4 text-base leading-relaxed'>
            Princeps Polycap is a self-taught Kenyan programmer documenting the real-time build-out of Poly, the AI operating system that funds Poly186, SESAP, Automating Basic Needs, and the Terraforming Sahara moonshot. Every experiment, success, and failure gets shared openly so other founders can see how post-scarcity infrastructure is made.
            </p>
        </div>
    </section>
  )
}

export default AboutCoverSection
