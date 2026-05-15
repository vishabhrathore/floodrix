"use client";

import React, { useState } from "react";

import { ArrowRight, MapPin } from "lucide-react";

import { PROJECTS } from "../constants";

const Projects: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const filters = ["All", "Highway Drainage", "Infrastructure", "Groundwater"];

  const filteredProjects =
    activeFilter === "All"
      ? PROJECTS
      : PROJECTS.filter((p) => p.category === activeFilter);

  return (
    <section id="projects" className="py-[8rem] bg-[#fafafa]">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="text-center w-full mx-auto mb-[5rem]">
          <h2 className="text-gray-400 text-label-caps mb-[1.5rem] tracking-[0.2em] text-[10px]">
            OUR PORTFOLIO
          </h2>
          <h3 className="text-section-title text-brand-dark mb-[3rem]">
            Engineering Excellence
          </h3>

          <div className="flex flex-wrap justify-center gap-[1rem]">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-[2rem] py-[0.75rem] rounded-xl font-bold transition-all text-[0.7rem] tracking-[0.2em] uppercase border ${
                  activeFilter === f
                    ? "bg-brand-red text-white border-brand-red shadow-xl -translate-y-[2px]"
                    : "bg-white text-gray-500 border-gray-100 hover:text-brand-red hover:border-brand-red/30 shadow-sm"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[2.5rem]">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col h-full border-t-2 border-transparent hover:border-brand-red"
            >
              <div className="relative h-[20rem] overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-[1.5rem] left-[1.5rem]">
                  <span className="bg-brand-red text-white text-[0.65rem] font-bold uppercase tracking-[0.2em] px-[1.2rem] py-[0.6rem] rounded-lg shadow-lg">
                    {project.category}
                  </span>
                </div>
              </div>

              <div className="p-[2.5rem] flex flex-col flex-1">
                <div className="flex items-center text-gray-400 text-[0.8rem] mb-[1rem] gap-[0.5rem] font-medium tracking-wide font-mono">
                  <MapPin className="w-[1rem] h-[1rem] text-brand-teal" />
                  {project.location}
                </div>
                <h4 className="text-[1.8rem] font-medium text-brand-dark mb-[1rem] group-hover:text-brand-red transition-colors leading-tight">
                  {project.title}
                </h4>
                <p className="text-gray-500 leading-relaxed mb-[2.5rem] font-light text-[1rem] line-clamp-3 flex-1">
                  {project.description}
                </p>
                <div className="mt-auto pt-[2rem] border-t border-gray-50 flex justify-between items-center">
                  <a
                    href="#"
                    className="bg-gray-50 hover:bg-brand-red text-brand-dark hover:text-white px-6 py-3 rounded-xl font-bold text-[0.7rem] tracking-[0.2em] transition-all uppercase flex items-center gap-3"
                  >
                    Case Study <ArrowRight className="w-4 h-4" />
                  </a>
                  <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:border-brand-teal group-hover:text-brand-teal transition-all">
                    <span className="text-[10px] font-mono">
                      ID_{project.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
