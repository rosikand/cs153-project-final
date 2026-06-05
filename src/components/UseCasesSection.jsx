import {
  Building2,
  GraduationCap,
  Leaf,
  Newspaper,
  ShieldAlert,
  Wheat
} from "lucide-react";
import { Badge } from "./ui/badge.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "./ui/card.jsx";

const USE_CASES = [
  {
    icon: ShieldAlert,
    title: "Disaster screening",
    audience: "Responders and NGOs",
    prompt: "Are there active wildfires near Los Angeles?",
    value:
      "Assemble regional imagery, hazard signals, weather, and caveats before deeper authoritative review."
  },
  {
    icon: Leaf,
    title: "Environmental monitoring",
    audience: "Researchers and conservation groups",
    prompt: "What does forest cover near Manaus look like today?",
    value:
      "Create a sourced snapshot of vegetation, smoke, flooding, or coastal conditions for a chosen area."
  },
  {
    icon: Wheat,
    title: "Agricultural context",
    audience: "Growers and analysts",
    prompt: "How cloudy and dry is this farming region?",
    value:
      "Join broad land-surface imagery with current atmospheric conditions to support field-level follow-up."
  },
  {
    icon: Building2,
    title: "Urban and coastal planning",
    audience: "Planners and community organizations",
    prompt: "What regional change signals are visible near this coast?",
    value:
      "Screen large-scale development, shoreline, flood, or surface-change questions before detailed GIS analysis."
  },
  {
    icon: Newspaper,
    title: "Public-interest reporting",
    audience: "Journalists and policy teams",
    prompt: "What evidence is available for this reported event?",
    value:
      "Collect dated imagery, public data, provenance, and limitations in a shareable investigation record."
  },
  {
    icon: GraduationCap,
    title: "Research and education",
    audience: "Students and instructors",
    prompt: "How does satellite evidence support this claim?",
    value:
      "Make geospatial acquisition and multimodal AI reasoning visible enough to inspect, critique, and reproduce."
  }
];

export default function UseCasesSection() {
  return (
    <section className="use-cases-section">
      <div className="use-cases-heading">
        <div>
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Potential use cases
          </span>
          <h2>One interface, many Earth questions.</h2>
        </div>
        <p>
          Parallax is most useful as a regional screening and research tool:
          it helps people find evidence faster while keeping source dates and
          limitations visible.
        </p>
      </div>

      <div className="use-case-grid">
        {USE_CASES.map(
          ({ icon: UseCaseIcon, title, audience, prompt, value }) => (
            <Card className="use-case-card gap-0 py-0 shadow-none" key={title}>
              <CardHeader className="flex-row items-start gap-3 px-5 py-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UseCaseIcon className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm">{title}</CardTitle>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {audience}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  {value}
                </p>
                <Badge
                  variant="secondary"
                  className="mt-4 max-w-full whitespace-normal px-2.5 py-1.5 font-normal leading-5"
                >
                  “{prompt}”
                </Badge>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </section>
  );
}
