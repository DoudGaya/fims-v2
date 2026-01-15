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
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <div className="h-4 w-4 text-muted-foreground">
                    <Icon className="h-6 w-6" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">{value}</div>
                {(description || trend) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {trend && (
                            <span className={cn(trendUp === true ? "text-green-500" : trendUp === false ? "text-red-500" : "")}>
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
            color: "hsl(var(--chart-2))",
        },
    } satisfies ChartConfig

    // Calculate end angle for the radial bar (360 degrees = 100%)
    // But we want a semi-circle or full circle? Let's go with full circle for "Goal" feel.
    // Actually, user asked for "modern" - a simple radial ring is nice.

    return (
        <Card className="flex border-0 shadow-none flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{subtext}</CardDescription>
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
                                                    className="fill-foreground text-4xl font-bold"
                                                >
                                                    {percentage.toFixed(0)}%
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
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
            <CardFooter className="flex-row justify-between gap-2 text-sm text-center">
                <div className="flex items-center gap-2 font-medium leading-none">
                    Target: {target.toLocaleString()} <TrendingUp className="h-4 w-4" />
                </div>
                <div className="leading-none text-muted-foreground">
                    {current.toLocaleString()} achieved so far
                </div>
            </CardFooter>
        </Card>
    )
}
