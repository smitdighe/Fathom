from pydantic import BaseModel, HttpUrl

from app.schemas.source import Source

__all__ = ["ReportSection", "WriterOutput", "FinalReport"]


class ReportSection(BaseModel):
    """A single section of the final report. Produced by the report-writer node."""

    heading: str
    content: str
    citations: list[HttpUrl]


class WriterOutput(BaseModel):
    """The LLM-authored portion of the report. Excludes source_list, which is
    built in code from real retrieved sources so the model cannot invent it."""

    title: str
    sections: list[ReportSection]
    confidence_notes: str


class FinalReport(BaseModel):
    """The complete synthesized research report. Produced by the report-writer node."""

    title: str
    sections: list[ReportSection]
    source_list: list[Source]
    confidence_notes: str
