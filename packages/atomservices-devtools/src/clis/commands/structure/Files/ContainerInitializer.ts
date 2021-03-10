import * as FS from "fs";
import * as Path from "path";
import * as Write from "write";
import { Indexer } from "../common/Indexer";
import { IProps } from "./IProps";

const keyText = "composeContainerInitializer";
const templateCreate = () => `import { Containers } from "atomservices";
import ServicesContainer from "./ServicesContainer";

const ContainerInitializer = Containers.${keyText}(ServicesContainer, {
});

export default ContainerInitializer;
`;

const templateImport = (type: string) => `import ${type} from "./${type}";\n`;
const templateService = (type: string) => `  ${type},\n`;

const sliceContent = (content: string) => {
  const importIndex = Indexer.ofNextImport(content);
  const indexOfKeyText = content.indexOf(keyText);
  const substr = content.slice(indexOfKeyText);
  let firstIndex = indexOfKeyText + substr.indexOf("{") + 1;

  if (content[firstIndex] === "\n") {
    firstIndex++;
  }

  const lastIndex = indexOfKeyText + substr.indexOf("}");

  const importSect = content.slice(0, importIndex);
  const preservicesSect = content.slice(importIndex, firstIndex);
  const servicesSect = content.slice(firstIndex, lastIndex);
  const postservicesSect = content.slice(lastIndex);

  return {
    import: importSect,
    preservices: preservicesSect,
    services: servicesSect,
    postservices: postservicesSect,
  };
};

export const ContainerInitializer = ({ basepath, containized, ext }: IProps) => {
  const file = Path.resolve(basepath, `./${containized}/ContainerInitializer.${ext}`);

  return {
    // CONTAINER
    create: () => {
      Write.sync(file, templateCreate());
    },
    // SERVICE
    addService: ({ type }: { type: string; }) => {
      const isExist = FS.existsSync(file);

      if (!isExist) {
        Write.sync(file, templateCreate());
      }

      const data = FS.readFileSync(file, "utf8");
      const importSection = templateImport(type);

      if (data.indexOf(importSection) === -1) {
        const sections = sliceContent(data);
        const content = sections.import +
          templateImport(type) +
          sections.preservices +
          sections.services +
          templateService(type) +
          sections.postservices;

        Write.sync(file, content);
      }
    },
  };
};
