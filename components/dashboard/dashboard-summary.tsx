"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import {
    Label,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
} from "recharts"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

// --- Stats Card Component ---

interface StatsCardProps {
    title: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
    description?: string
    trend?: string
    trendUp?: boolean
    className?: string
}

export function StatsCard({ title, value, icon: Icon, description, trend, trendUp, className }: StatsCardProps) {
    return (
        <Card className={cn("overflow-hidden border-[#DCEAF3] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wide text-[#475569]">
                    {title}
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F3F8FC] text-[#013358]">
                    <Icon className="h-5 w-5" />
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-normal text-[#1E293B]">{value}</div>
                {(description || trend) && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-[#64748B]">
                        {trend && (
                            <span className={cn("font-semibold", trendUp === true ? "text-[#10B981]" : trendUp === false ? "text-[#EF4444]" : "")}>
                                {trend}
                            </span>
                        )}
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

// --- Goal Progress Radial Chart ---

interface GoalProgressProps {
    current: number
    target: number
    title: string
    subtext: string
}

export function GoalProgress({ current, target, title, subtext }: GoalProgressProps) {
    const percentage = Math.min((current / target) * 100, 100)

    // Normalized data for the radial chart
    const chartData = [
        { name: "progress", value: percentage, fill: "var(--color-progress)" },
    ]

    const chartConfig = {
        progress: {
            label: "Progress",
            color: "#10B981",
        },
    } satisfies ChartConfig

    // Calculate end angle for the radial bar (360 degrees = 100%)
    // But we want a semi-circle or full circle? Let's go with full circle for "Goal" feel.
    // Actually, user asked for "modern" - a simple radial ring is nice.

    return (
        <Card className="flex h-full flex-col border-[#DCEAF3] bg-white shadow-sm">
            <CardHeader className="items-center pb-0 text-center">
                <CardTitle className="text-lg text-[#1E293B]">{title}</CardTitle>
                <CardDescription className="text-[#64748B]">{subtext}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <RadialBarChart
                        data={chartData}
                        startAngle={90}
                        endAngle={90 - (360 * percentage) / 100}
                        innerRadius={80}
                        outerRadius={110}
                    >
                        <PolarGrid
                            gridType="circle"
                            radialLines={false}
                            stroke="none"
                            className="first:fill-muted last:fill-background"
                            polarRadius={[86, 74]}
                        />
                        <RadialBar dataKey="value" background cornerRadius={10} />
                        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-[#1E293B] text-4xl font-bold"
                                                >
                                                    {percentage.toFixed(0)}%
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-[#64748B]"
                                                >
                                                    Complete
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </PolarRadiusAxis>
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-row justify-between gap-2 py-4 border-t border-[#E5E7EB] text-center text-sm">
                <div className="flex items-center gap-2 font-semibold leading-none text-[#013358]">
                    Target: {target.toLocaleString()} <TrendingUp className="h-4 w-4" />
                </div>
                <div className="leading-none text-[#64748B]">
                    {current.toLocaleString()} achieved so far
                </div>
            </CardFooter>
        </Card>
    )
}
