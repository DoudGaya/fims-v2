"use client"

import * as React from "react"
import { Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, Pie, PieChart, Label, Sector, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts"

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

const DASHBOARD_CHART_PALETTE = [
    "#013358",
    "#10B981",
    "#F59E0B",
    "#3B82F6",
    "#EF4444",
    "#0F766E",
    "#7C3AED",
    "#14B8A6",
    "#F97316",
    "#64748B",
]

const getPaletteColor = (index: number) => DASHBOARD_CHART_PALETTE[index % DASHBOARD_CHART_PALETTE.length]

const getGenderColor = (gender: string, index: number) => {
    const label = gender.toLowerCase()

    if (label.includes("female")) return "#F97316"
    if (label.includes("male")) return "#013358"
    return getPaletteColor(index + 2)
}

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    // Shift center outward slightly along the midAngle to emphasize the active sector
    const RADIAN = Math.PI / 180;
    const midAngle = (startAngle + endAngle) / 2;
    const cos = Math.cos(-RADIAN * midAngle);
    const sin = Math.sin(-RADIAN * midAngle);
    
    // Shift by 6px
    const mx = cx + 6 * cos;
    const my = cy + 6 * sin;
    
    return (
        <g>
            {/* Soft background shadow sector */}
            <Sector
                cx={mx}
                cy={my}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                opacity={0.15}
            />
            {/* The main shifted segment */}
            <Sector
                cx={mx}
                cy={my}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                stroke="#FFFFFF"
                strokeWidth={3}
            />
        </g>
    );
};

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
    const chartData = React.useMemo(
        () => data.map((item) => ({ ...item, fill: "#013358" })),
        [data]
    )
    const totalRegistrations = React.useMemo(() => data.reduce((acc, curr) => acc + curr.count, 0), [data])
    const [activeMonth, setActiveMonth] = React.useState<string>()
    const activeMonthIndex = React.useMemo(
        () => chartData.findIndex((item) => item.month === activeMonth),
        [activeMonth, chartData]
    )

    return (
        <Card className="border-[#DCEAF3] bg-white shadow-sm">
            <CardHeader>
                <CardTitle className="text-[#1E293B]">Registration Trends</CardTitle>
                <CardDescription>Monthly farmer registrations over the last 24 months</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
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
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`registration-${entry.month}-${index}`}
                                    fill={entry.fill}
                                    opacity={!activeMonth || activeMonthIndex === index ? 1 : 0.55}
                                    stroke={activeMonthIndex === index ? "#013358" : "transparent"}
                                    strokeWidth={activeMonthIndex === index ? 1.5 : 0}
                                    className="cursor-pointer transition-opacity duration-200"
                                    onMouseEnter={() => setActiveMonth(entry.month)}
                                    onMouseLeave={() => setActiveMonth(undefined)}
                                />
                            ))}
                        </Bar>
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
            fill: getGenderColor(item.gender, index)
        }))
    }, [data])

    const chartConfig = {
        count: {
            label: "Farmers",
        },
        ...(data || []).reduce((acc, item, index) => {
            acc[item.gender] = {
                label: item.gender,
                color: getGenderColor(item.gender, index)
            }
            return acc
        }, {} as ChartConfig)
    } satisfies ChartConfig

    const [activeGender, setActiveGender] = React.useState(chartData[0]?.gender)

    React.useEffect(() => {
        if (chartData.length > 0 && !chartData.some((item) => item.gender === activeGender)) {
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
                        <defs>
                            <filter id="badge-shadow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                            </filter>
                        </defs>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="gender"
                            innerRadius={60}
                            outerRadius={112}
                            paddingAngle={1.5}
                            strokeWidth={3}
                            {...{
                                activeIndex,
                                activeShape: renderActiveShape
                            } as any}
                            onMouseEnter={(_, index) => {
                                const item = chartData[index]
                                if (item) setActiveGender(item.gender)
                            }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`gender-${entry.gender}-${index}`}
                                    fill={entry.fill}
                                    stroke="#FFFFFF"
                                    strokeWidth={2}
                                    className="cursor-pointer"
                                />
                            ))}
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        const cx = viewBox.cx ?? 0;
                                        const cy = viewBox.cy ?? 0;
                                        const currentItem = chartData[activeIndex];
                                        if (!currentItem) return null;
                                        
                                        const activeColor = currentItem.fill;
                                        const activeLabel = currentItem.gender;
                                        const activeCount = currentItem.count;
                                        
                                        return (
                                            <g>
                                                {/* Speech bubble/pill container */}
                                                <g filter="url(#badge-shadow)">
                                                    <rect
                                                        x={cx - 55}
                                                        y={cy - 48}
                                                        width={110}
                                                        height={26}
                                                        rx={13}
                                                        fill="#FFFFFF"
                                                        stroke="#E5E7EB"
                                                        strokeWidth={1.5}
                                                    />
                                                    {/* Status indicator dot */}
                                                    <circle
                                                        cx={cx - 43}
                                                        cy={cy - 35}
                                                        r={4.5}
                                                        fill={activeColor}
                                                    />
                                                    {/* Label name */}
                                                    <text
                                                        x={cx - 34}
                                                        y={cy - 31}
                                                        className="fill-[#475569] text-[11px] font-semibold"
                                                        textAnchor="start"
                                                        dominantBaseline="middle"
                                                    >
                                                        {activeLabel}
                                                    </text>
                                                    {/* Value */}
                                                    <text
                                                        x={cx + 43}
                                                        y={cy - 31}
                                                        className="fill-[#1E293B] text-[11px] font-bold"
                                                        textAnchor="end"
                                                        dominantBaseline="middle"
                                                    >
                                                        {activeCount >= 1000 ? (activeCount / 1000).toFixed(0) + "K" : activeCount}
                                                    </text>
                                                </g>
                                                
                                                {/* Large center count */}
                                                <text
                                                    x={cx}
                                                    y={cy + 14}
                                                    className="fill-[#1E293B] text-3xl font-extrabold tracking-tight"
                                                    textAnchor="middle"
                                                >
                                                    {activeCount.toLocaleString()}
                                                </text>
                                                
                                                {/* Sub-label */}
                                                <text
                                                    x={cx}
                                                    y={cy + 34}
                                                    className="fill-[#64748B] text-[11px] font-bold uppercase tracking-wider"
                                                    textAnchor="middle"
                                                >
                                                    Farmers
                                                </text>
                                            </g>
                                        );
                                    }
                                    return null;
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
            return [...cropsData].sort((a, b) => b.count - a.count).slice(0, 10).map((c) => ({
                label: c.crop,
                count: c.count,
                fill: "#013358"
            }))
        } else {
            if (!statesData || !Array.isArray(statesData)) return [];
            return [...statesData].sort((a, b) => b.count - a.count).slice(0, 10).map((s) => ({
                label: s.state,
                count: s.count,
                fill: "#013358"
            }))
        }
    }, [activeView, cropsData, statesData])

    const [activeMetric, setActiveMetric] = React.useState<string>()
    const activeMetricIndex = React.useMemo(
        () => propsData.findIndex((item) => item.label === activeMetric),
        [activeMetric, propsData]
    )

    React.useEffect(() => {
        setActiveMetric(undefined)
    }, [activeView])

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
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {propsData.map((entry, index) => (
                                <Cell
                                    key={`metric-${activeView}-${entry.label}-${index}`}
                                    fill={entry.fill}
                                    opacity={!activeMetric || activeMetricIndex === index ? 1 : 0.55}
                                    stroke={activeMetricIndex === index ? "#013358" : "transparent"}
                                    strokeWidth={activeMetricIndex === index ? 1.5 : 0}
                                    className="cursor-pointer transition-opacity duration-200"
                                    onMouseEnter={() => setActiveMetric(entry.label)}
                                    onMouseLeave={() => setActiveMetric(undefined)}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

// --- Cluster Performance Chart ---

export function ClusterPerformanceChart({ data }: { data?: ClusterDatum[] }) {
    // Sort and take top 6 clusters to show a nice hexagonal distribution
    const sortedData = React.useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return [...data].sort((a, b) => b.farmersCount - a.farmersCount).slice(0, 6);
    }, [data]);

    const chartConfig = {
        farmersCount: {
            label: "Members",
            color: "#013358"
        }
    } satisfies ChartConfig

    if (sortedData.length === 0) {
        return emptyChartMessage("Cluster Distribution", "No cluster distribution data available")
    }

    return (
        <Card className="border-[#DCEAF3] bg-white shadow-sm flex flex-col h-full">
            <CardHeader>
                <CardTitle className="text-[#1E293B]">Cluster Performance</CardTitle>
                <CardDescription>Distribution of registered farmers across top clusters</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 flex items-center justify-center min-h-[300px]">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto w-full max-h-[300px]"
                >
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sortedData}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis 
                            dataKey="clusterTitle" 
                            tick={{ fill: "#64748B", fontSize: 10, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis 
                            angle={30} 
                            domain={[0, 'auto']} 
                            tick={{ fill: "#94A3B8", fontSize: 8 }}
                        />
                        <Radar
                            name="Farmers"
                            dataKey="farmersCount"
                            stroke="#013358"
                            fill="#013358"
                            fillOpacity={0.2}
                            activeDot={{ r: 6, fill: "#013358", stroke: "#FFFFFF", strokeWidth: 2 }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
