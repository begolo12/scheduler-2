import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Task, Holiday, Project } from '../types';
import { format, differenceInDays, eachDayOfInterval, isSameDay, isAfter, parseISO, isValid } from 'date-fns';

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  holidays: Holiday[];
  taskNumberMap: Record<string, string>;
  onTaskClick: (task: Task) => void;
  onLabelClick: (task: Task) => void;
  startDate: Date;
  endDate: Date;
  scrollToTaskId?: string | null;
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  tasks, 
  projects,
  holidays, 
  taskNumberMap,
  onTaskClick, 
  onLabelClick,
  startDate, 
  endDate,
  scrollToTaskId 
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isMobile = containerWidth < 768;
  
  // Define widths for the left sidebar columns
  const noColWidth = isMobile ? 35 : 45;
  const taskNameColWidth = isMobile ? 100 : 180;
  const labelWidth = noColWidth + taskNameColWidth;

  const days = useMemo(() => {
    try {
      if (!isValid(startDate) || !isValid(endDate) || isAfter(startDate, endDate)) {
        return [];
      }
      return eachDayOfInterval({ start: startDate, end: endDate });
    } catch (e) {
      console.error("Date interval error", e);
      return [];
    }
  }, [startDate, endDate]);
  
  const isOneMonth = days.length <= 32;
  const minColWidth = isOneMonth ? (isMobile ? 35 : 40) : (isMobile ? 18 : 20);
  
  const colWidth = useMemo(() => {
    if (containerWidth === 0 || days.length === 0) return minColWidth;
    const availableWidth = containerWidth - labelWidth - 2; 
    const dynamicWidth = availableWidth / days.length;
    return isOneMonth ? Math.max(dynamicWidth, minColWidth) : Math.max(dynamicWidth, 15);
  }, [containerWidth, labelWidth, days.length, isOneMonth, minColWidth]);

  const rowHeight = isMobile ? 48 : 50;
  const headerHeight = isMobile ? 65 : 75;

  const scrollToTask = (task: Task) => {
    if (!task.startDate || !containerRef.current) return;
    const taskDate = parseISO(task.startDate);
    if (!isValid(taskDate)) return;
    
    const dayOffset = differenceInDays(taskDate, startDate);
    const scrollX = Math.max(0, (dayOffset * colWidth) - 100);
    
    containerRef.current.scrollTo({
      left: scrollX,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (scrollToTaskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === scrollToTaskId);
      if (task) {
        const timer = setTimeout(() => scrollToTask(task), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [scrollToTaskId, startDate, tasks]);

  useEffect(() => {
    if (!svgRef.current || days.length === 0 || containerWidth === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartWidth = days.length * colWidth;
    const chartHeight = Math.max(tasks.length * rowHeight, 300);

    svg.attr("width", labelWidth + chartWidth)
       .attr("height", headerHeight + chartHeight + 40);

    const defs = svg.append("defs");
    
    const filter = defs.append("filter")
        .attr("id", "task-shadow-final-v3")
        .attr("height", "150%");
    filter.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 1).attr("result", "blur");
    filter.append("feOffset").attr("dx", 0).attr("dy", 1).attr("result", "offsetBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    defs.append("clipPath")
        .attr("id", "gantt-chart-boundary-fixed")
        .append("rect")
        .attr("x", 0)
        .attr("y", -headerHeight)
        .attr("width", chartWidth)
        .attr("height", chartHeight + headerHeight + 200);

    // 1. Background Grid
    const grid = svg.append("g")
      .attr("transform", `translate(${labelWidth}, ${headerHeight})`)
      .attr("clip-path", "url(#gantt-chart-boundary-fixed)");
    
    days.forEach((day, i) => {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const holiday = holidays.find(h => h && h.date && isSameDay(new Date(h.date), day));
      const x = i * colWidth;
      
      if (isWeekend || holiday) {
        grid.append("rect")
          .attr("x", x).attr("y", 0).attr("width", colWidth).attr("height", chartHeight)
          .attr("fill", holiday ? "#fff1f2" : "#f8fafc");
      }
      grid.append("line").attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", chartHeight).attr("stroke", "#f1f5f9").attr("stroke-width", 1);
    });

    for(let i=0; i <= tasks.length; i++) {
      grid.append("line").attr("x1", 0).attr("x2", chartWidth).attr("y1", i * rowHeight).attr("y2", i * rowHeight).attr("stroke", "#f1f5f9").attr("stroke-width", 1);
    }

    // 2. Timeline Header
    const header = svg.append("g").attr("transform", `translate(${labelWidth}, 0)`);
    days.forEach((day, i) => {
      const x = i * colWidth;
      if (day.getDate() === 1 || i === 0) {
        header.append("text").attr("x", x + 6).attr("y", 20).text(format(day, isMobile ? "MMM" : "MMMM yyyy").toUpperCase()).attr("font-size", "8px").attr("font-weight", "900").attr("fill", "#94a3b8");
      }
      const holiday = holidays.find(h => h && h.date && isSameDay(new Date(h.date), day));
      if (isOneMonth || day.getDate() % 5 === 0 || day.getDate() === 1) {
        header.append("text").attr("x", x + colWidth / 2).attr("y", 40).attr("text-anchor", "middle").text(day.getDate()).attr("font-size", isMobile ? "9px" : "11px").attr("font-weight", holiday ? "900" : "800").attr("fill", holiday ? "#ef4444" : "#334155");
      }
      if (isOneMonth) {
        header.append("text").attr("x", x + colWidth / 2).attr("y", 54).attr("text-anchor", "middle").text(format(day, 'E')[0].toUpperCase()).attr("font-size", "7px").attr("font-weight", "900").attr("fill", holiday || day.getDay() === 0 ? "#f43f5e" : "#cbd5e1");
      }
    });

    // 3. Task Bars
    const bars = svg.append("g")
      .attr("transform", `translate(${labelWidth}, ${headerHeight})`)
      .attr("clip-path", "url(#gantt-chart-boundary-fixed)");

    const today = new Date();
    
    tasks.forEach((task, i) => {
      if (!task.startDate || !task.endDate) return;
      
      const tStart = parseISO(task.startDate);
      const tEnd = parseISO(task.endDate);

      // Validation to prevent NaNs
      if (!isValid(tStart) || !isValid(tEnd)) return;

      const padding = isMobile ? 8 : 10;
      const y = i * rowHeight + padding;
      const bHeight = rowHeight - (padding * 2);
      
      const startOffset = differenceInDays(tStart, startDate);
      const duration = Math.max(differenceInDays(tEnd, tStart) + 1, 1);
      
      // Calculate coordinates and ensure they are finite numbers
      const x = startOffset * colWidth;
      const width = Math.max(duration * colWidth, 10);

      if (!Number.isFinite(x) || !Number.isFinite(width)) return;

      let barColor = "#6366f1"; 
      if (task.completed || task.status === 'Finalisasi') barColor = "#10b981"; 
      else {
        const totalDuration = Math.max(differenceInDays(tEnd, tStart), 1);
        const elapsed = differenceInDays(today, tStart);
        const progressPercent = Math.min(Math.max(elapsed / totalDuration, 0), 1);
        barColor = isAfter(today, tEnd) ? "#f43f5e" : d3.interpolateRgb("#10b981", "#f43f5e")(progressPercent);
      }

      const barGroup = bars.append("g").attr("class", "cursor-pointer group").on("click", () => onTaskClick(task));
      barGroup.append("rect")
        .attr("x", x + 1).attr("y", y).attr("width", Math.max(width - 2, 8)).attr("height", bHeight)
        .attr("rx", 6).attr("fill", barColor).attr("stroke", "white").attr("stroke-width", 1)
        .attr("filter", "url(#task-shadow-final-v3)");

      if (width > 40) {
        barGroup.append("text").attr("x", x + 8).attr("y", y + bHeight / 2 + 3).text(task.title).attr("font-size", "8px").attr("font-weight", "800").attr("fill", "white").attr("pointer-events", "none");
      }
    });

    // Today Indicator
    if (today >= startDate && today <= endDate) {
      const todayX = differenceInDays(today, startDate) * colWidth + (colWidth / 2);
      grid.append("line").attr("x1", todayX).attr("x2", todayX).attr("y1", 0).attr("y2", chartHeight).attr("stroke", "#f43f5e").attr("stroke-width", 1.5).attr("stroke-dasharray", "4,2").attr("opacity", 0.7);
    }

    // 4. Left Sidebar Header (NO | TASK NAME)
    const labelHeader = svg.append("g");
    labelHeader.append("rect").attr("x", 0).attr("y", 0).attr("width", labelWidth).attr("height", headerHeight).attr("fill", "white").attr("stroke", "#f1f5f9");
    
    // Column headers
    labelHeader.append("text").attr("x", 8).attr("y", headerHeight - 30).text("NO").attr("font-size", "8px").attr("font-weight", "900").attr("fill", "#64748b").attr("letter-spacing", "0.05em");
    labelHeader.append("text").attr("x", noColWidth + 8).attr("y", headerHeight - 30).text("TASK NAME").attr("font-size", "8px").attr("font-weight", "900").attr("fill", "#64748b").attr("letter-spacing", "0.05em");
    
    // Separator line for NO column in header
    labelHeader.append("line").attr("x1", noColWidth).attr("x2", noColWidth).attr("y1", headerHeight - 45).attr("y2", headerHeight).attr("stroke", "#f1f5f9");

    // 5. Left Sidebar Rows
    const labelsGroup = svg.append("g").attr("transform", `translate(0, ${headerHeight})`);
    tasks.forEach((task, i) => {
      const y = i * rowHeight;
      const project = projects.find(p => p.id === task.projectId);
      const subLabel = project ? `${project.name} | ${task.division || 'General'}` : (task.division || 'General');
      const tNum = taskNumberMap[task.id] || '';

      const g = labelsGroup.append("g")
        .attr("class", "cursor-pointer")
        .on("click", () => {
          onLabelClick(task);
          scrollToTask(task);
        });

      // Background row
      g.append("rect")
        .attr("x", 0).attr("y", y).attr("width", labelWidth).attr("height", rowHeight)
        .attr("fill", i % 2 === 0 ? "white" : "#fcfdfe").attr("stroke", "#f1f5f9");

      // Column separator line
      g.append("line").attr("x1", noColWidth).attr("x2", noColWidth).attr("y1", y).attr("y2", y + rowHeight).attr("stroke", "#f1f5f9");

      // NO Column Text
      g.append("text").attr("x", noColWidth / 2).attr("y", y + (rowHeight / 2) + 3).attr("text-anchor", "middle").text(tNum).attr("font-size", isMobile ? "8px" : "9px").attr("font-weight", "900").attr("fill", "#64748b");

      // TASK NAME Column Text
      g.append("text").attr("x", noColWidth + 12).attr("y", y + (rowHeight / 2) - 2).text(task.title || 'Untitled').attr("font-size", isMobile ? "9px" : "10px").attr("font-weight", "900").attr("fill", "#1e293b");
      g.append("text").attr("x", noColWidth + 12).attr("y", y + (rowHeight / 2) + 10).text((subLabel || '').toUpperCase()).attr("font-size", "6.5px").attr("font-weight", "900").attr("fill", "#6366f1").attr("letter-spacing", "0.01em");
    });

  }, [tasks, projects, days, holidays, taskNumberMap, onTaskClick, startDate, endDate, containerWidth, colWidth, isOneMonth, rowHeight, labelWidth, isMobile, noColWidth]);

  return (
    <div className="relative w-full h-full flex flex-col bg-white overflow-hidden rounded-xl border shadow-sm border-slate-100">
      <div className="flex-1 w-full overflow-auto gantt-scroll overflow-x-auto" ref={containerRef}>
        <svg ref={svgRef} className="block" />
      </div>
    </div>
  );
};

export default GanttChart;