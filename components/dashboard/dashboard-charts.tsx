"use client"

import * as React from "react"
import { Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Label } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
    ChartStyle
} from "@/components/ui/chart"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"


// --- Registration Trends Chart ---

type MonthlyTrend = { month: string; count: number }
type GenderDatum = { gender: string; count: number }
type CropDatum = { crop: string; count: number }
type StateDatum = { state: string; count: number }
type ClusterDatum = { clusterTitle: string; farmersCount: number }

const emptyChartMessage = (title: string, description: string) => (
    <Card className="border-[#DCEAF3] bg-white shadow-sm">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center text-sm text-[#64748B]">
            No data available yet.
        </CardContent>
    </Card>
)

export function RegistrationEstimatorChart({ trends }: { trends?: MonthlyTrend[] }) {
    const chartConfig = {
        count: {
            label: "Registrations",
            color: "var(--chart-1)",
            icon: Users,
        },
    } satisfies ChartConfig

    const data = React.useMemo(() => trends ?? [], [trends])
    const totalRegistrations = React.useMemo(() => data.reduce((acc, curr) => acc + curr.count, 0), [data])

    return (
        <Card className="border-[#DCEAF3] bg-white shadow-sm">
            <CardHeader>
                <CardTitle className="text-[#1E293B]">Registration Trends</CardTitle>
                <CardDescription>Monthly farmer registrations over the last 24 months</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart accessibilityLayer data={data}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <ChartTooltip
                            cursor={{ fill: "rgba(220, 234, 243, 0.45)" }}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="border-t border-[#E5E7EB] text-sm text-[#475569]">
                Total registrations in view: <span className="font-bold text-[#013358]">{totalRegistrations.toLocaleString()}</span>
            </CardFooter>
        </Card>
    )
}


// --- Gender Distribution Pie Chart ---

export function GenderDistributionChart({ data }: { data?: GenderDatum[] }) {

    const chartData = React.useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data.map((item, index) => ({
            gender: item.gender,
            count: item.count,
            fill: `var(--chart-${(index % 5) + 1})`
        }))
    }, [data])

    const chartConfig = {
        count: {
            label: "Farmers",
        },
        ...(data || []).reduce((acc, item, index) => {
            acc[item.gender] = {
                label: item.gender,
                color: `var(--chart-${(index % 5) + 1})`
            }
            return acc
        }, {} as ChartConfig)
    } satisfies ChartConfig

    const [activeGender, setActiveGender] = React.useState(chartData[0]?.gender)

    React.useEffect(() => {
        if (!activeGender && chartData.length > 0) {
            setActiveGender(chartData[0].gender)
        }
    }, [chartData, activeGender])

    const activeIndex = React.useMemo(
        () => chartData.findIndex((item) => item.gender === activeGender),
        [activeGender, chartData]
    )

    const genders = React.useMemo(() => chartData.map((item) => item.gender), [chartData])

    if (chartData.length === 0) return emptyChartMessage("Gender Distribution", "No demographic breakdown available")

    return (
        <Card data-chart="gender-interactive" className="flex flex-col border-[#DCEAF3] bg-white shadow-sm">
            <ChartStyle id="gender-interactive" config={chartConfig} />
            <CardHeader className="flex-row items-center justify-between pb-0 md:flex-row flex-col space-y-2 md:space-y-0">
                <div className="grid gap-1">
                    <CardTitle className="text-[#1E293B]">Gender Distribution</CardTitle>
                    <CardDescription>Demographic breakdown</CardDescription>
                </div>
                <Select value={activeGender} onValueChange={setActiveGender}>
                    <SelectTrigger
                        className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
                        aria-label="Select a gender"
                    >
                        <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-xl">
                        {genders.map((key) => {
                            const config = chartConfig[key as keyof typeof chartConfig]
                            const item = chartData.find(c => c.gender === key)

                            if (!config || !item) {
                                return null
                            }

                            return (
                                <SelectItem
                                    key={key}
                                    value={key}
                                    className="rounded-lg [&_span]:flex"
                                >
                                    <div className="flex items-center gap-2 text-xs">
                                        <span
                                            className="flex h-3 w-3 shrink-0 rounded-xs"
                                            style={{
                                                backgroundColor: item.fill,
                                            }}
                                        />
                                        <span className="truncate max-w-[120px]">{config?.label}</span>
                                    </div>
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="flex flex-1 justify-center pb-0">
                <ChartContainer
                    id="gender-interactive"
                    config={chartConfig}
                    className="mx-auto aspect-square w-full max-w-[300px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="gender"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        const currentItem = chartData[activeIndex];
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
                                                    className="fill-[#1E293B] text-3xl font-bold"
                                                >
                                                    {currentItem ? currentItem.count.toLocaleString() : 0}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-[#64748B]"
                                                >
                                                    Farmers
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

// --- Crops & States Interactive Chart ---

export function CropsStatesInteractiveChart({
    cropsData,
    statesData
}: {
    cropsData?: CropDatum[],
    statesData?: StateDatum[]
}) {
    const [activeView, setActiveView] = React.useState<"crops" | "states">("crops")

    const propsData = React.useMemo(() => {
        if (activeView === "crops") {
            if (!cropsData || !Array.isArray(cropsData)) return [];
            return [...cropsData].sort((a, b) => b.count - a.count).slice(0, 10).map(c => ({
                label: c.crop,
                count: c.count
            }))
        } else {
            if (!statesData || !Array.isArray(statesData)) return [];
            return [...statesData].sort((a, b) => b.count - a.count).slice(0, 10).map(s => ({
                label: s.state,
                count: s.count
            }))
        }
    }, [activeView, cropsData, statesData])

    const chartConfig = {
        count: {
            label: "Count",
            color: activeView === "crops" ? "var(--chart-2)" : "var(--chart-4)"
        },
        crops: {
            label: "Top Crops",
            color: "var(--chart-2)"
        },
        states: {
            label: "Top States",
            color: "var(--chart-4)"
        }
    } satisfies ChartConfig

    return (
        <Card className="border-[#DCEAF3] bg-white py-0 shadow-sm">
            <CardHeader className="flex flex-col items-stretch border-b border-[#E5E7EB] !p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
                    <CardTitle className="text-[#1E293B]">Performance Metrics</CardTitle>
                    <CardDescription>
                        Top performers across crops and states
                    </CardDescription>
                </div>
                <div className="flex">
                    {["crops", "states"].map((key) => {
                        const viewKey = key as "crops" | "states"
                        return (
                            <button
                                key={key}
                                data-active={activeView === key}
                                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-[#E5E7EB] px-6 py-4 text-left outline-none transition data-[active=true]:bg-[#F3F8FC] data-[active=true]:text-[#013358] even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                                onClick={() => setActiveView(viewKey)}
                            >
                                <span className="text-muted-foreground text-xs">
                                    {chartConfig[viewKey].label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[300px] w-full"
                >
                    <BarChart
                        accessibilityLayer
                        data={propsData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            interval={0}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    className="w-[150px]"
                                    nameKey="count"
                                    labelKey="label"
                                />
                            }
                        />
                        <Bar dataKey="count" fill={chartConfig.count.color} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

// --- Cluster Performance Chart ---

export function ClusterPerformanceChart({ data }: { data?: ClusterDatum[] }) {
    // Sort and take top 5 or 10
    const sortedData = React.useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return [...data].sort((a, b) => b.farmersCount - a.farmersCount).slice(0, 10).map((item, index) => ({
            ...item,
            fill: `var(--chart-${(index % 5) + 1})`
        }));
    }, [data]);

    const chartConfig = {
        farmersCount: {
            label: "Members",
        },
        ...sortedData.reduce((acc, item, index) => {
            acc[item.clusterTitle] = {
                label: item.clusterTitle,
                color: `var(--chart-${(index % 5) + 1})`
            }
            return acc
        }, {} as ChartConfig)
    } satisfies ChartConfig

    const [activeCluster, setActiveCluster] = React.useState(sortedData[0]?.clusterTitle)

    // Sync state if data changes
    React.useEffect(() => {
        if (!activeCluster && sortedData.length > 0) {
            setActiveCluster(sortedData[0].clusterTitle)
        }
    }, [sortedData, activeCluster])


    const activeIndex = React.useMemo(
        () => sortedData.findIndex((item) => item.clusterTitle === activeCluster),
        [activeCluster, sortedData]
    )

    const clusters = React.useMemo(() => sortedData.map((item) => item.clusterTitle), [sortedData])

    if (sortedData.length === 0) {
        return (
            emptyChartMessage("Top Clusters", "No cluster membership data available")
        )
    }

    return (
        <Card data-chart="cluster-interactive" className="flex flex-col border-[#DCEAF3] bg-white shadow-sm">
            <ChartStyle id="cluster-interactive" config={chartConfig} />
            <CardHeader className="flex-row items-center justify-between pb-0 md:flex-row flex-col space-y-2 md:space-y-0">
                <div className="grid gap-1">
                    <CardTitle className="text-[#1E293B]">Top Clusters</CardTitle>
                    <CardDescription>Cluster membership breakdown</CardDescription>
                </div>
                <Select value={activeCluster} onValueChange={setActiveCluster}>
                    <SelectTrigger
                        className="ml-auto h-7 w-[160px] rounded-lg pl-2.5"
                        aria-label="Select a cluster"
                    >
                        <SelectValue placeholder="Select cluster" />
                    </SelectTrigger>
                    <SelectContent align="end" className="rounded-xl max-h-[200px]">
                        {clusters.map((key) => {
                            const config = chartConfig[key as keyof typeof chartConfig]
                            const item = sortedData.find(c => c.clusterTitle === key)

                            if (!config || !item) {
                                return null
                            }

                            return (
                                <SelectItem
                                    key={key}
                                    value={key}
                                    className="rounded-lg [&_span]:flex"
                                >
                                    <div className="flex items-center gap-2 text-xs">
                                        <span
                                            className="flex h-3 w-3 shrink-0 rounded-xs"
                                            style={{
                                                backgroundColor: item.fill,
                                            }}
                                        />
                                        <span className="truncate max-w-[120px]">{config?.label}</span>
                                    </div>
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="flex flex-1 justify-center pb-0">
                <ChartContainer
                    id="cluster-interactive"
                    config={chartConfig}
                    className="mx-auto aspect-square w-full max-w-[300px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={sortedData}
                            dataKey="farmersCount"
                            nameKey="clusterTitle"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        const currentItem = sortedData[activeIndex];
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
                                                    className="fill-[#1E293B] text-3xl font-bold"
                                                >
                                                    {currentItem ? currentItem.farmersCount.toLocaleString() : 0}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-[#64748B]"
                                                >
                                                    Members
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

