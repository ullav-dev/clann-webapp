import { getTranslations } from "next-intl/server";
import HelpPageClient, { type HelpSection } from "@/components/HelpPageClient";

export default async function HelpPage() {
  const t = await getTranslations("help");

  const sections: HelpSection[] = [
    {
      id: "gettingStarted",
      icon: "🚀",
      title: t("gettingStarted.title"),
      steps: [
        { number: 1, title: t("gettingStarted.step1Title"), body: t("gettingStarted.step1Body") },
        { number: 2, title: t("gettingStarted.step2Title"), body: t("gettingStarted.step2Body") },
        { number: 3, title: t("gettingStarted.step3Title"), body: t("gettingStarted.step3Body") },
        { number: 4, title: t("gettingStarted.step4Title"), body: t("gettingStarted.step4Body") },
        { number: 5, title: t("gettingStarted.step5Title"), body: t("gettingStarted.step5Body") },
      ],
    },
    {
      id: "people",
      icon: "👤",
      title: t("people.title"),
      cards: [
        { title: t("people.fieldsTitle"), body: t("people.fieldsBody") },
        { title: t("people.photoTitle"), body: t("people.photoBody") },
        { title: t("people.editTitle"), body: t("people.editBody") },
      ],
    },
    {
      id: "relationships",
      icon: "👥",
      title: t("relationships.title"),
      cards: [
        { title: t("relationships.typesTitle"), body: t("relationships.typesBody") },
        { title: t("relationships.siblingTitle"), body: t("relationships.siblingBody") },
        { title: t("relationships.parentTitle"), body: t("relationships.parentBody") },
        { title: t("relationships.filterTitle"), body: t("relationships.filterBody") },
        { title: t("relationships.spouseTitle"), body: t("relationships.spouseBody") },
        { title: t("relationships.setupFamilyTitle"), body: t("relationships.setupFamilyBody") },
        { title: t("relationships.adoptionTitle"), body: t("relationships.adoptionBody") },
        { title: t("relationships.adoptionPrincipleTitle"), body: t("relationships.adoptionPrincipleBody") },
        { title: t("relationships.adoptionScenario1Title"), body: t("relationships.adoptionScenario1Body") },
        { title: t("relationships.adoptionScenario2Title"), body: t("relationships.adoptionScenario2Body") },
        { title: t("relationships.adoptionVisualTitle"), body: t("relationships.adoptionVisualBody") },
      ],
    },
    {
      id: "familyTree",
      icon: "🌳",
      title: t("familyTree.title"),
      cards: [
        { title: t("familyTree.overviewTitle"), body: t("familyTree.overviewBody") },
        { title: t("familyTree.coloursTitle"), body: t("familyTree.coloursBody") },
        { title: t("familyTree.navigationTitle"), body: t("familyTree.navigationBody") },
        { title: t("familyTree.orientationTitle"), body: t("familyTree.orientationBody") },
        { title: t("familyTree.exportTitle"), body: t("familyTree.exportBody") },
        { title: t("familyTree.mediaLibraryTitle"), body: t("familyTree.mediaLibraryBody") },
      ],
    },
    {
      id: "familyList",
      icon: "📋",
      title: t("familyList.title"),
      cards: [
        { title: t("familyList.viewsTitle"), body: t("familyList.viewsBody") },
        { title: t("familyList.searchTitle"), body: t("familyList.searchBody") },
        { title: t("familyList.paginationTitle"), body: t("familyList.paginationBody") },
      ],
    },
    {
      id: "lifeStory",
      icon: "📖",
      title: t("lifeStory.title"),
      cards: [
        { title: t("lifeStory.overviewTitle"), body: t("lifeStory.overviewBody") },
        { title: t("lifeStory.editingTitle"), body: t("lifeStory.editingBody") },
        { title: t("lifeStory.markdownTitle"), body: t("lifeStory.markdownBody") },
        { title: t("lifeStory.lifeImageTitle"), body: t("lifeStory.lifeImageBody") },
        { title: t("lifeStory.exportPdfTitle"), body: t("lifeStory.exportPdfBody") },
        { title: t("lifeStory.mediaLibraryTitle"), body: t("lifeStory.mediaLibraryBody") },
      ],
    },
    {
      id: "lifeEvents",
      icon: "📅",
      title: t("lifeEvents.title"),
      cards: [
        { title: t("lifeEvents.overviewTitle"), body: t("lifeEvents.overviewBody") },
        { title: t("lifeEvents.timelineTitle"), body: t("lifeEvents.timelineBody") },
        { title: t("lifeEvents.addingTitle"), body: t("lifeEvents.addingBody") },
        { title: t("lifeEvents.viewingTitle"), body: t("lifeEvents.viewingBody") },
        { title: t("lifeEvents.editingTitle"), body: t("lifeEvents.editingBody") },
        { title: t("lifeEvents.sourcesTitle"), body: t("lifeEvents.sourcesBody") },
      ],
    },
    {
      id: "research",
      icon: "📝",
      title: t("research.title"),
      cards: [
        { title: t("research.overviewTitle"), body: t("research.overviewBody") },
        { title: t("research.notesTitle"), body: t("research.notesBody") },
        { title: t("research.editingTitle"), body: t("research.editingBody") },
        { title: t("research.foldersTitle"), body: t("research.foldersBody") },
        { title: t("research.sharingTitle"), body: t("research.sharingBody") },
        { title: t("research.repliesTitle"), body: t("research.repliesBody") },
        { title: t("research.wikiTitle"), body: t("research.wikiBody") },
        { title: t("research.censusTitle"), body: t("research.censusBody") },
        { title: t("research.censusAttributionTitle"), body: t("research.censusAttributionBody") },
      ],
    },
    {
      id: "aiAssistant",
      icon: "🤖",
      title: t("aiAssistant.title"),
      cards: [
        { title: t("aiAssistant.overviewTitle"), body: t("aiAssistant.overviewBody") },
        { title: t("aiAssistant.setupTitle"), body: t("aiAssistant.setupBody") },
        { title: t("aiAssistant.providersTitle"), body: t("aiAssistant.providersBody") },
        { title: t("aiAssistant.startingTitle"), body: t("aiAssistant.startingBody") },
        { title: t("aiAssistant.templatesTitle"), body: t("aiAssistant.templatesBody") },
        { title: t("aiAssistant.personContextTitle"), body: t("aiAssistant.personContextBody") },
        { title: t("aiAssistant.treeContextTitle"), body: t("aiAssistant.treeContextBody") },
        { title: t("aiAssistant.saveTitle"), body: t("aiAssistant.saveBody") },
        { title: t("aiAssistant.historyTitle"), body: t("aiAssistant.historyBody") },
        { title: t("aiAssistant.digDeeperTitle"), body: t("aiAssistant.digDeeperBody") },
      ],
    },
    {
      id: "multipleTrees",
      icon: "🌲",
      title: t("multipleTrees.title"),
      cards: [
        { title: t("multipleTrees.manageTitle"), body: t("multipleTrees.manageBody") },
        { title: t("multipleTrees.primaryTitle"), body: t("multipleTrees.primaryBody") },
        { title: t("multipleTrees.exportTitle"), body: t("multipleTrees.exportBody") },
        { title: t("multipleTrees.importTitle"), body: t("multipleTrees.importBody") },
      ],
    },
    {
      id: "teams",
      icon: "👥",
      title: t("teams.title"),
      cards: [
        { title: t("teams.whatTitle"), body: t("teams.whatBody") },
        { title: t("teams.createTitle"), body: t("teams.createBody") },
        { title: t("teams.inviteTitle"), body: t("teams.inviteBody") },
        { title: t("teams.acceptTitle"), body: t("teams.acceptBody") },
        { title: t("teams.linkTreeTitle"), body: t("teams.linkTreeBody") },
        { title: t("teams.sharedTreeTitle"), body: t("teams.sharedTreeBody") },
        { title: t("teams.manageTitle"), body: t("teams.manageBody") },
      ],
    },
    {
      id: "gedcom",
      icon: "🔗",
      title: t("gedcom.title"),
      cards: [
        { title: t("gedcom.whatTitle"), body: t("gedcom.whatBody") },
        { title: t("gedcom.exportTitle"), body: t("gedcom.exportBody") },
        { title: t("gedcom.importTitle"), body: t("gedcom.importBody") },
        { title: t("gedcom.warningsTitle"), body: t("gedcom.warningsBody") },
        { title: t("gedcom.includedTitle"), body: t("gedcom.includedBody") },
        { title: t("gedcom.compatTitle"), body: t("gedcom.compatBody") },
      ],
    },
    {
      id: "contactUs",
      icon: "✉️",
      title: t("contactUs.title"),
      cards: [
        { title: t("contactUs.supportTitle"), body: t("contactUs.supportBody"), email: "support@ullav.com" },
        { title: t("contactUs.contactTitle"), body: t("contactUs.contactBody"), email: "info@ullav.com" },
        { title: t("contactUs.accountTitle"), body: t("contactUs.accountBody"), email: "support@ullav.com" },
      ],
    },
  ];

  return (
    <HelpPageClient
      title={t("title")}
      subtitle={t("subtitle")}
      sections={sections}
      ctaText={t("cta")}
      ctaButtonText={t("ctaButton")}
      ctaHref="/family"
    />
  );
}
